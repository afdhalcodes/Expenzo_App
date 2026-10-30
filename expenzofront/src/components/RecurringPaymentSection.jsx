
import { useEffect, useState } from "react";

import {
    getRecurringPayments,
    createRecurringPayment,
    updateRecurringPayment,
    pauseRecurringPayment,
    resumeRecurringPayment,
    markRecurringPaymentAsPaid,
    deleteRecurringPayment
} from "../services/recurringPaymentService";

import "../recurring-payment.css";

const EMPTY_FORM = {
    accountId: "",
    title: "",
    amount: "",
    frequency: "MONTHLY",
    category: "SUBSCRIPTION",
    nextDueDate: "",
    reminderDaysBefore: "1",
    note: ""
};

function formatAmount(amount) {
    return Number(amount ?? 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(date) {
    if (!date) {
        return "Not set";
    }

    return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function RecurringPaymentSection({ accounts = [] }) {
    const [payments, setPayments] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState("ALL");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [actionId, setActionId] = useState(null);

    const [showForm, setShowForm] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const [resumePayment, setResumePayment] = useState(null);
    const [resumeDate, setResumeDate] = useState("");
    const [resumeReminder, setResumeReminder] = useState("1");

    // Keep "All accounts" selected initially. If the account list changes,
    // reset to "All accounts" only when the previous selected account no longer exists.
    useEffect(() => {
        if (accounts.length === 0) {
            setSelectedAccount("ALL");
            return;
        }

        if (
            selectedAccount !== "ALL" &&
            !accounts.some(account => String(account.id) === selectedAccount)
        ) {
            setSelectedAccount("ALL");
        }
    }, [accounts, selectedAccount]);

    // Load recurring payments from every account so the initial view shows all.
    async function loadPayments() {
        setLoading(true);
        setError("");

        try {
            const results = await Promise.all(
                accounts.map(async account => {
                    const data = await getRecurringPayments(account.id);
                    return (Array.isArray(data) ? data : []).map(payment => ({
                        ...payment,
                        accountId: payment.accountId ?? account.id
                    }));
                })
            );

            setPayments(results.flat());
        } catch (error) {
            setError(error.message || "Unable to load recurring payments.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadPayments();
        // accounts are provided by Dashboard after the account request completes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accounts]);

    // Show all payments or only payments belonging to the selected account.
    const visiblePayments = selectedAccount === "ALL"
        ? payments
        : payments.filter(
            payment => String(payment.accountId) === selectedAccount
        );

    function replacePayment(updatedPayment, fallbackAccountId) {
        if (!updatedPayment) return;

        const normalized = {
            ...updatedPayment,
            accountId: updatedPayment.accountId ?? fallbackAccountId
        };

        setPayments(current => current.map(payment =>
            String(payment.id) === String(normalized.id) &&
            String(payment.accountId) === String(normalized.accountId)
                ? { ...payment, ...normalized }
                : payment
        ));
    }

    // Update one field in the form.
    function handleChange(event) {
        const { name, value } = event.target;

        setForm(current => ({
            ...current,
            [name]: value
        }));
    }

    // Open the form for creating a new payment.
    function openCreateForm() {
        setEditingPayment(null);
        setForm({
            ...EMPTY_FORM,
            accountId: selectedAccount === "ALL"
                ? String(accounts[0]?.id ?? "")
                : selectedAccount
        });
        setError("");
        setShowForm(true);
    }

    // Open the form with the selected payment's existing details.
    function openEditForm(payment) {
        setEditingPayment(payment);

        setForm({
            accountId: String(payment.accountId ?? selectedAccount),
            title: payment.title ?? "",
            amount: String(payment.amount ?? ""),
            frequency: payment.frequency ?? "MONTHLY",
            category: payment.category ?? "OTHER",
            nextDueDate: payment.nextDueDate ?? "",
            reminderDaysBefore: String(payment.reminderDaysBefore ?? 1),
            note: payment.note ?? ""
        });

        setError("");
        setShowForm(true);
    }

    // Create or update a payment.
    async function handleSubmit(event) {
        event.preventDefault();

        const accountId = form.accountId;

        if (!accountId) {
            setError("Please select an account.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const paymentData = {
                title: form.title.trim(),
                amount: form.amount,
                frequency: form.frequency,
                category: form.category,
                nextDueDate: form.nextDueDate,
                reminderDaysBefore: form.reminderDaysBefore,
                note: form.note.trim()
            };

            if (editingPayment) {
                const updated = await updateRecurringPayment(
                    accountId,
                    editingPayment.id,
                    paymentData
                );
                replacePayment(updated, accountId);
            } else {
                const created = await createRecurringPayment(accountId, paymentData);
                setPayments(current => [
                    ...current,
                    { ...created, accountId: created?.accountId ?? Number(accountId) }
                ]);
            }

            setShowForm(false);
            setEditingPayment(null);
            // Re-fetch the latest list after adding or editing a payment.
            await loadPayments();
        } catch (error) {
            setError(error.message || "Unable to save the payment.");
        } finally {
            setSaving(false);
        }
    }

    // Pause an active payment.
    async function handlePause(payment) {
        if (!window.confirm(`Pause "${payment.title}"?`)) {
            return;
        }

        setActionId(payment.id);
        setError("");

        try {
            const updated = await pauseRecurringPayment(payment.accountId, payment.id);
            replacePayment(updated, payment.accountId);
        } catch (error) {
            setError(error.message || "Unable to pause the payment.");
        } finally {
            setActionId(null);
        }
    }

    // Open the resume form for a paused payment.
    function openResumeForm(payment) {
        setResumePayment(payment);
        setResumeDate(payment.nextDueDate ?? "");
        setResumeReminder(String(payment.reminderDaysBefore ?? 1));
        setError("");
    }

    // Resume a payment with a new due date.
    async function handleResume(event) {
        event.preventDefault();

        setActionId(resumePayment.id);
        setError("");

        try {
            const updated = await resumeRecurringPayment(
                resumePayment.accountId,
                resumePayment.id,
                resumeDate,
                resumeReminder
            );

            setResumePayment(null);
            replacePayment(updated, resumePayment.accountId);
        } catch (error) {
            setError(error.message || "Unable to resume the payment.");
        } finally {
            setActionId(null);
        }
    }

    // Record the payment and let the backend update the due date.
    async function handlePay(payment) {
        if (!window.confirm(`Mark "${payment.title}" as paid?`)) {
            return;
        }

        setActionId(payment.id);
        setError("");

        try {
            const updated = await markRecurringPaymentAsPaid(
                payment.accountId,
                payment.id
            );

            // Update the recurring payment card immediately from the backend response.
            replacePayment(updated, payment.accountId);

            // Refresh transactions and account balances without reloading the page.
            window.dispatchEvent(new CustomEvent("expenzo:transactions-updated", {
                detail: { accountId: payment.accountId }
            }));
        } catch (error) {
            setError(error.message || "Unable to record the payment.");
        } finally {
            setActionId(null);
        }
    }

    // Delete a payment.
    async function handleDelete(payment) {
        if (!window.confirm(`Delete "${payment.title}"?`)) {
            return;
        }

        setActionId(payment.id);
        setError("");

        try {
            await deleteRecurringPayment(
                payment.accountId,
                payment.id
            );

            setPayments(current => current.filter(item =>
                !(String(item.id) === String(payment.id) &&
                  String(item.accountId) === String(payment.accountId))
            ));
        } catch (error) {
            setError(error.message || "Unable to delete the payment.");
        } finally {
            setActionId(null);
        }
    }

    return (
        <section className="recurring-payments-section">
            <div className="recurring-payments-section-header">
                <div>
                    <h2>Recurring Payments</h2>
                    <p>Manage bills, subscriptions and regular payments.</p>
                </div>

                <button
                    className="add-recurring-payment-button"
                    type="button"
                    onClick={openCreateForm}
                    disabled={accounts.length === 0}
                >
                    + Add Recurring Payment
                </button>
            </div>

            {accounts.length > 0 && (
                <div className="recurring-account-filter">
                    <label htmlFor="recurring-account">
                        Select Account
                    </label>

                    <select
                        id="recurring-account"
                        value={selectedAccount}
                        onChange={event => setSelectedAccount(event.target.value)}
                    >
                        <option value="ALL">All accounts</option>
                        {accounts.map(account => (
                            <option key={account.id} value={String(account.id)}>
                                {account.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {error && (
                <p className="recurring-payment-form-error">{error}</p>
            )}

            {loading ? (
                <p>Loading recurring payments...</p>
            ) : visiblePayments.length === 0 ? (
                <div className="empty-recurring-payments">
                    <h3>No recurring payments yet</h3>
                    <p>Add a subscription, bill or other regular payment.</p>
                </div>
            ) : (
                <div className="recurring-payments-list">
                    {visiblePayments.map(payment => {
                        const status = String(payment.status ?? "").toUpperCase();
                        const paused = status === "PAUSED";
                        const busy = actionId === payment.id;

                        return (
                            <article
                                className="recurring-payment-card"
                                key={payment.id}
                            >
                                <div className="recurring-payment-main">
                                    <div className="recurring-payment-icon">
                                        ₹
                                    </div>

                                    <div className="recurring-payment-info">
                                        <h3>{payment.title}</h3>

                                        <p>
                                            {accounts.find(account => String(account.id) === String(payment.accountId))?.name ?? "Account"} · {payment.category} · {payment.frequency}
                                        </p>

                                        {payment.note && (
                                            <p>{payment.note}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="recurring-payment-details">
                                    <strong>
                                        ₹{formatAmount(payment.amount)}
                                    </strong>

                                    <span>
                                        Next due: {formatDate(payment.nextDueDate)}
                                    </span>

                                    <span
                                        className={`recurring-status ${
                                            paused ? "paused" : "active"
                                        }`}
                                    >
                                        {payment.status}
                                    </span>
                                </div>

                                <div className="recurring-payment-actions">
                                    <button
                                        className="recurring-action-button"
                                        type="button"
                                        onClick={() => openEditForm(payment)}
                                        disabled={busy}
                                    >
                                        Edit
                                    </button>

                                    {!paused && status !== "COMPLETED" && (
                                        <>
                                            <button
                                                className="recurring-action-button pay"
                                                type="button"
                                                onClick={() => handlePay(payment)}
                                                disabled={busy}
                                            >
                                                Mark Paid
                                            </button>

                                            <button
                                                className="recurring-action-button pause"
                                                type="button"
                                                onClick={() => handlePause(payment)}
                                                disabled={busy}
                                            >
                                                Pause
                                            </button>
                                        </>
                                    )}

                                    {paused && (
                                        <button
                                            className="recurring-action-button resume"
                                            type="button"
                                            onClick={() => openResumeForm(payment)}
                                            disabled={busy}
                                        >
                                            Resume
                                        </button>
                                    )}

                                    <button
                                        className="recurring-action-button delete"
                                        type="button"
                                        onClick={() => handleDelete(payment)}
                                        disabled={busy}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Create and edit modal */}
            {showForm && (
                <div
                    className="modal-overlay"
                    onClick={() => setShowForm(false)}
                >
                    <div
                        className="recurring-payment-modal"
                        onClick={event => event.stopPropagation()}
                    >
                        <button
                            className="modal-close-button"
                            type="button"
                            onClick={() => setShowForm(false)}
                        >
                            ×
                        </button>

                        <div className="recurring-payment-modal-header">
                            <h2>
                                {editingPayment
                                    ? "Edit Recurring Payment"
                                    : "Add Recurring Payment"}
                            </h2>
                            <p>Enter your regular payment details.</p>
                        </div>

                        <form
                            className="recurring-payment-form"
                            onSubmit={handleSubmit}
                        >
                            <div className="recurring-payment-form-group">
                                <label htmlFor="recurring-account-form">
                                    Account
                                </label>

                                <select
                                    id="recurring-account-form"
                                    name="accountId"
                                    value={form.accountId}
                                    onChange={handleChange}
                                    required
                                >
                                    {accounts.map(account => (
                                        <option
                                            key={account.id}
                                            value={account.id}
                                        >
                                            {account.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="recurring-payment-form-group">
                                <label htmlFor="recurring-title">Title</label>
                                <input
                                    id="recurring-title"
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    placeholder="e.g. Netflix subscription"
                                    required
                                />
                            </div>

                            <div className="recurring-payment-form-grid">
                                <div className="recurring-payment-form-group">
                                    <label htmlFor="recurring-amount">
                                        Amount
                                    </label>
                                    <input
                                        id="recurring-amount"
                                        name="amount"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={form.amount}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="recurring-payment-form-group">
                                    <label htmlFor="recurring-frequency">
                                        Frequency
                                    </label>
                                    <select
                                        id="recurring-frequency"
                                        name="frequency"
                                        value={form.frequency}
                                        onChange={handleChange}
                                    >
                                        <option value="DAILY">Daily</option>
                                        <option value="WEEKLY">Weekly</option>
                                        <option value="MONTHLY">Monthly</option>
                                        <option value="YEARLY">Yearly</option>
                                    </select>
                                </div>
                            </div>

                            <div className="recurring-payment-form-grid">
                                <div className="recurring-payment-form-group">
                                    <label htmlFor="recurring-category">
                                        Category
                                    </label>
                                    <select
                                        id="recurring-category"
                                        name="category"
                                        value={form.category}
                                        onChange={handleChange}
                                    >
                                        <option value="SUBSCRIPTION">
                                            Subscription
                                        </option>
                                        <option value="BILL">Bill</option>
                                        <option value="MEMBERSHIP">
                                            Membership
                                        </option>
                                        <option value="RENT">Rent</option>
                                        <option value="INSURANCE">
                                            Insurance
                                        </option>
                                        <option value="UTILITIES">
                                            Utilities
                                        </option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>

                                <div className="recurring-payment-form-group">
                                    <label htmlFor="recurring-due-date">
                                        Next Due Date
                                    </label>
                                    <input
                                        id="recurring-due-date"
                                        name="nextDueDate"
                                        type="date"
                                        value={form.nextDueDate}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="recurring-payment-form-group">
                                <label htmlFor="recurring-reminder">
                                    Reminder Days Before
                                </label>
                                <input
                                    id="recurring-reminder"
                                    name="reminderDaysBefore"
                                    type="number"
                                    min="0"
                                    max="365"
                                    value={form.reminderDaysBefore}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="recurring-payment-form-group">
                                <label htmlFor="recurring-note">Note</label>
                                <input
                                    id="recurring-note"
                                    name="note"
                                    value={form.note}
                                    onChange={handleChange}
                                    placeholder="Optional note"
                                />
                            </div>

                            <button
                                className="create-recurring-payment-button"
                                type="submit"
                                disabled={saving}
                            >
                                {saving
                                    ? "Saving..."
                                    : editingPayment
                                        ? "Save Changes"
                                        : "Create Recurring Payment"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Resume modal */}
            {resumePayment && (
                <div
                    className="modal-overlay"
                    onClick={() => setResumePayment(null)}
                >
                    <div
                        className="recurring-payment-modal"
                        onClick={event => event.stopPropagation()}
                    >
                        <button
                            className="modal-close-button"
                            type="button"
                            onClick={() => setResumePayment(null)}
                        >
                            ×
                        </button>

                        <div className="recurring-payment-modal-header">
                            <h2>Resume Payment</h2>
                            <p>
                                Choose the next due date for{" "}
                                {resumePayment.title}.
                            </p>
                        </div>

                        <form
                            className="recurring-payment-form"
                            onSubmit={handleResume}
                        >
                            <div className="recurring-payment-form-group">
                                <label htmlFor="resume-due-date">
                                    Next Due Date
                                </label>
                                <input
                                    id="resume-due-date"
                                    type="date"
                                    value={resumeDate}
                                    onChange={event =>
                                        setResumeDate(event.target.value)
                                    }
                                    required
                                />
                            </div>

                            <div className="recurring-payment-form-group">
                                <label htmlFor="resume-reminder">
                                    Reminder Days Before
                                </label>
                                <input
                                    id="resume-reminder"
                                    type="number"
                                    min="0"
                                    max="365"
                                    value={resumeReminder}
                                    onChange={event =>
                                        setResumeReminder(event.target.value)
                                    }
                                />
                            </div>

                            <button
                                className="create-recurring-payment-button"
                                type="submit"
                                disabled={actionId === resumePayment.id}
                            >
                                {actionId === resumePayment.id
                                    ? "Resuming..."
                                    : "Resume Payment"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}

export default RecurringPaymentSection;
