
import { useCallback, useEffect, useState } from "react";
import {
    getDebts,
    createDebt,
    repayDebt,
    deleteDebt
} from "../services/debtService";
import "../debt.css";

function todayLocal() {
    const now = new Date();
    const local = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
    );

    return local.toISOString().slice(0, 10);
}

function formatMoney(amount, currency = "INR") {
    return `${currency} ${Number(amount ?? 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function formatDate(value) {
    if (!value) return "Not scheduled";

    const date = new Date(`${value.slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function DebtSection({ accounts = [] }) {
    const [debts, setDebts] = useState([]);
    const [filter, setFilter] = useState("ALL");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [actionId, setActionId] = useState(null);

    const [showCreate, setShowCreate] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState(null);

    const [form, setForm] = useState({
        accountId: "",
        personName: "",
        title: "",
        amount: "",
        firstReminderDate: todayLocal(),
        note: ""
    });

    const [repayment, setRepayment] = useState({
        amount: "",
        paymentDate: todayLocal(),
        note: ""
    });

    const loadDebts = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await getDebts();
            setDebts(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || "Unable to load debts.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDebts();
    }, [loadDebts]);

    useEffect(() => {
        if (
            filter !== "ALL" &&
            !accounts.some(account => String(account.id) === filter)
        ) {
            setFilter("ALL");
        }
    }, [accounts, filter]);

    const visibleDebts =
        filter === "ALL"
            ? debts
            : debts.filter(
                  debt => String(debt.accountId) === filter
              );

    const activeDebts = visibleDebts.filter(
        debt => debt.status === "ACTIVE"
    );

    const totalRemaining = activeDebts.reduce(
        (sum, debt) => sum + Number(debt.remainingAmount ?? 0),
        0
    );

    const totalOriginal = visibleDebts.reduce(
        (sum, debt) => sum + Number(debt.originalAmount ?? 0),
        0
    );

    function openCreateForm() {
        setForm({
            accountId: accounts[0] ? String(accounts[0].id) : "",
            personName: "",
            title: "",
            amount: "",
            firstReminderDate: todayLocal(),
            note: ""
        });

        setError("");
        setShowCreate(true);
    }

    function changeForm(event) {
        const { name, value } = event.target;

        setForm(current => ({
            ...current,
            [name]: value
        }));
    }

    async function handleCreate(event) {
        event.preventDefault();
        setError("");

        if (!form.accountId) {
            setError("Please select an account.");
            return;
        }

        if (!form.personName.trim()) {
            setError("Please enter the person's name.");
            return;
        }

        if (!form.title.trim()) {
            setError("Please enter a debt description.");
            return;
        }

        if (!form.amount || Number(form.amount) <= 0) {
            setError("The amount must be greater than zero.");
            return;
        }

        if (!form.firstReminderDate) {
            setError("Please select the first reminder date.");
            return;
        }

        if (form.firstReminderDate < todayLocal()) {
            setError("The first reminder date cannot be in the past.");
            return;
        }

        setSaving(true);

        try {
            const created = await createDebt(
                Number(form.accountId),
                form
            );

            setDebts(current => [created, ...current]);
            setShowCreate(false);
        } catch (err) {
            setError(err.message || "Unable to create the debt.");
        } finally {
            setSaving(false);
        }
    }

    function openRepayment(debt) {
        setError("");
        setSelectedDebt(debt);

        setRepayment({
            amount: String(debt.remainingAmount ?? ""),
            paymentDate: todayLocal(),
            note: ""
        });
    }

    function changeRepayment(event) {
        const { name, value } = event.target;

        setRepayment(current => ({
            ...current,
            [name]: value
        }));
    }

    async function handleRepay(event) {
        event.preventDefault();

        if (!selectedDebt) return;

        const amount = Number(repayment.amount);
        const remaining = Number(selectedDebt.remainingAmount);

        if (!Number.isFinite(amount) || amount <= 0) {
            setError("Repayment amount must be greater than zero.");
            return;
        }

        if (amount > remaining) {
            setError(
                "Repayment cannot exceed the remaining debt amount."
            );
            return;
        }

        if (!repayment.paymentDate) {
            setError("Please select a payment date.");
            return;
        }

        if (repayment.paymentDate > todayLocal()) {
            setError("Payment date cannot be in the future.");
            return;
        }

        if (
            !window.confirm(
                `Record a repayment of ${formatMoney(
                    amount,
                    selectedDebt.currency
                )} to ${selectedDebt.personName}?`
            )
        ) {
            return;
        }

        setActionId(selectedDebt.id);
        setError("");

        try {
            const updated = await repayDebt(
                selectedDebt.id,
                repayment
            );

            // Update the debt card immediately.
            setDebts(current =>
                current.map(debt =>
                    String(debt.id) === String(updated.id)
                        ? updated
                        : debt
                )
            );

            // Close the repayment form.
            setSelectedDebt(null);

            // Notify the transaction section and account balances.
            window.dispatchEvent(
                new CustomEvent("expenzo:transactions-updated", {
                    detail: {
                        accountId: selectedDebt.accountId,
                        source: "debt"
                    }
                })
            );
        } catch (err) {
            setError(err.message || "Unable to record repayment.");
        } finally {
            setActionId(null);
        }
    }

    async function handleDelete(debt) {
        if (
            !window.confirm(
                `Delete the debt "${debt.title}" for ${debt.personName}?`
            )
        ) {
            return;
        }

        setActionId(debt.id);
        setError("");

        try {
            await deleteDebt(debt.id);

            setDebts(current =>
                current.filter(
                    item => String(item.id) !== String(debt.id)
                )
            );
        } catch (err) {
            setError(err.message || "Unable to delete the debt.");
        } finally {
            setActionId(null);
        }
    }

    return (
        <section className="debts-section" id="debts">
            <div className="debts-section-header">
                <div>
                    <span className="debt-eyebrow">PERSONAL FINANCE</span>
                    <h2>Debts</h2>
                    <p>
                        Keep track of money you owe and pay it back on time.
                    </p>
                </div>

                <button
                    type="button"
                    className="add-debt-button"
                    onClick={openCreateForm}
                    disabled={accounts.length === 0}
                >
                    + Add Debt
                </button>
            </div>

            <div className="debt-filter">
                <label htmlFor="debt-account-filter">
                    Filter by account
                </label>

                <select
                    id="debt-account-filter"
                    value={filter}
                    onChange={event => setFilter(event.target.value)}
                >
                    <option value="ALL">All accounts</option>

                    {accounts.map(account => (
                        <option
                            key={account.id}
                            value={String(account.id)}
                        >
                            {account.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="debt-summary-grid">
                <article className="debt-summary-card debt-summary-primary">
                    <span>Total remaining</span>
                    <strong>{formatMoney(totalRemaining)}</strong>
                    <small>Across active debts</small>
                </article>

                <article className="debt-summary-card">
                    <span>Original amount</span>
                    <strong>{formatMoney(totalOriginal)}</strong>
                    <small>{visibleDebts.length} debt(s) tracked</small>
                </article>

                <article className="debt-summary-card">
                    <span>Active debts</span>
                    <strong>{activeDebts.length}</strong>
                    <small>
                        {visibleDebts.filter(
                            debt => debt.status === "PAID"
                        ).length}{" "}
                        fully repaid
                    </small>
                </article>
            </div>

            {error && (
                <div className="debt-error" role="alert">
                    {error}
                </div>
            )}

            {loading ? (
                <p className="loading-message">Loading debts...</p>
            ) : visibleDebts.length === 0 ? (
                <div className="debt-empty-state">
                    <div className="debt-empty-icon">₹</div>
                    <h3>No debts yet</h3>
                    <p>
                        Add money you owe someone to track repayments and
                        weekly reminders.
                    </p>
                    <button
                        type="button"
                        className="add-debt-button"
                        onClick={openCreateForm}
                        disabled={accounts.length === 0}
                    >
                        + Add your first debt
                    </button>
                </div>
            ) : (
                <div className="debt-list">
                    {visibleDebts.map(debt => {
                        const paid =
                            debt.status === "PAID";

                        const original = Number(debt.originalAmount ?? 0);
                        const remaining = Number(debt.remainingAmount ?? 0);

                        const paidAmount = Math.max(
                            0,
                            original - remaining
                        );

                        const progress =
                            original > 0
                                ? Math.min(
                                      100,
                                      (paidAmount / original) * 100
                                  )
                                : 0;

                        const overdue =
                            !paid &&
                            debt.nextReminderDate &&
                            debt.nextReminderDate < todayLocal();

                        return (
                            <article className="debt-card" key={debt.id}>
                                <div className="debt-card-header">
                                    <div className="debt-person-icon">
                                        {debt.personName
                                            ?.trim()
                                            .charAt(0)
                                            .toUpperCase() || "D"}
                                    </div>

                                    <div className="debt-person-details">
                                        <h3>{debt.title}</h3>
                                        <p>
                                            Owed to{" "}
                                            <strong>{debt.personName}</strong>
                                        </p>
                                        <span className="debt-account-name">
                                            {debt.accountName}
                                        </span>
                                    </div>

                                    <span
                                        className={`debt-status ${
                                            paid ? "paid" : "active"
                                        }`}
                                    >
                                        {paid ? "PAID" : "ACTIVE"}
                                    </span>
                                </div>

                                <div className="debt-amount-row">
                                    <div>
                                        <span>Remaining</span>
                                        <strong className="debt-remaining">
                                            {formatMoney(
                                                remaining,
                                                debt.currency
                                            )}
                                        </strong>
                                    </div>

                                    <div className="debt-original">
                                        <span>Original amount</span>
                                        <strong>
                                            {formatMoney(
                                                original,
                                                debt.currency
                                            )}
                                        </strong>
                                    </div>
                                </div>

                                <div
                                    className="debt-progress-track"
                                    role="progressbar"
                                    aria-valuenow={Math.round(progress)}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label="Debt repayment progress"
                                >
                                    <div
                                        className="debt-progress-fill"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>

                                <div className="debt-progress-label">
                                    <span>
                                        {formatMoney(
                                            paidAmount,
                                            debt.currency
                                        )}{" "}
                                        repaid
                                    </span>
                                    <strong>{Math.round(progress)}%</strong>
                                </div>

                                <div className="debt-reminder-row">
                                    <span>Next reminder</span>

                                    <strong
                                        className={
                                            overdue ? "debt-overdue" : ""
                                        }
                                    >
                                        {paid
                                            ? "No further reminders"
                                            : overdue
                                              ? `Overdue · ${formatDate(
                                                    debt.nextReminderDate
                                                )}`
                                              : formatDate(
                                                    debt.nextReminderDate
                                                )}
                                    </strong>
                                </div>

                                {debt.note && (
                                    <p className="debt-note">{debt.note}</p>
                                )}

                                <div className="debt-actions">
                                    {!paid && (
                                        <button
                                            type="button"
                                            className="add-debt-button"
                                            disabled={
                                                actionId === debt.id
                                            }
                                            onClick={() =>
                                                openRepayment(debt)
                                            }
                                        >
                                            Record repayment
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        className="debt-delete-button"
                                        disabled={actionId === debt.id}
                                        onClick={() => handleDelete(debt)}
                                    >
                                        {actionId === debt.id
                                            ? "Please wait..."
                                            : "Delete"}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {showCreate && (
                <div
                    className="debt-modal-overlay"
                    onMouseDown={event => {
                        if (
                            event.target === event.currentTarget &&
                            !saving
                        ) {
                            setShowCreate(false);
                        }
                    }}
                >
                    <div
                        className="debt-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-debt-title"
                    >
                        <button
                            type="button"
                            className="debt-modal-close"
                            onClick={() => setShowCreate(false)}
                            disabled={saving}
                            aria-label="Close"
                        >
                            ×
                        </button>

                        <h2 id="create-debt-title">Add a debt</h2>
                        <p className="debt-modal-subtitle">
                            Record money you need to repay.
                        </p>

                        <form
                            className="debt-form"
                            onSubmit={handleCreate}
                        >
                            <label className="debt-form-group">
                                Account
                                <select
                                    name="accountId"
                                    value={form.accountId}
                                    onChange={changeForm}
                                    required
                                >
                                    {accounts.map(account => (
                                        <option
                                            key={account.id}
                                            value={String(account.id)}
                                        >
                                            {account.name} ({account.currency})
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="debt-form-group">
                                Person you owe
                                <input
                                    name="personName"
                                    value={form.personName}
                                    onChange={changeForm}
                                    placeholder="e.g. Rahul"
                                    maxLength={120}
                                    required
                                />
                            </label>

                            <label className="debt-form-group">
                                Description
                                <input
                                    name="title"
                                    value={form.title}
                                    onChange={changeForm}
                                    placeholder="e.g. Money borrowed"
                                    maxLength={160}
                                    required
                                />
                            </label>

                            <label className="debt-form-group">
                                Amount
                                <input
                                    name="amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={form.amount}
                                    onChange={changeForm}
                                    placeholder="0.00"
                                    required
                                />
                            </label>

                            <label className="debt-form-group">
                                First reminder date
                                <input
                                    name="firstReminderDate"
                                    type="date"
                                    min={todayLocal()}
                                    value={form.firstReminderDate}
                                    onChange={changeForm}
                                    required
                                />
                                <small>
                                    After a partial repayment, the backend
                                    schedules the next reminder weekly.
                                </small>
                            </label>

                            <label className="debt-form-group">
                                Note (optional)
                                <textarea
                                    name="note"
                                    value={form.note}
                                    onChange={changeForm}
                                    placeholder="Additional details"
                                    rows={3}
                                    maxLength={1000}
                                />
                            </label>

                            {error && (
                                <p className="debt-error">{error}</p>
                            )}

                            <button
                                type="submit"
                                className="add-debt-button debt-submit"
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "Create debt"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {selectedDebt && (
                <div className="debt-modal-overlay">
                    <div
                        className="debt-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="repay-debt-title"
                    >
                        <button
                            type="button"
                            className="debt-modal-close"
                            onClick={() => setSelectedDebt(null)}
                            disabled={actionId === selectedDebt.id}
                            aria-label="Close"
                        >
                            ×
                        </button>

                        <h2 id="repay-debt-title">Record repayment</h2>

                        <p className="debt-modal-subtitle">
                            Repayment to {selectedDebt.personName}
                        </p>

                        <div className="debt-repayment-balance">
                            <span>Remaining balance</span>
                            <strong>
                                {formatMoney(
                                    selectedDebt.remainingAmount,
                                    selectedDebt.currency
                                )}
                            </strong>
                        </div>

                        <form
                            className="debt-form"
                            onSubmit={handleRepay}
                        >
                            <label className="debt-form-group">
                                Repayment amount
                                <input
                                    name="amount"
                                    type="number"
                                    min="0.01"
                                    max={selectedDebt.remainingAmount}
                                    step="0.01"
                                    value={repayment.amount}
                                    onChange={changeRepayment}
                                    required
                                />
                            </label>

                            <div className="debt-quick-amounts">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setRepayment(current => ({
                                            ...current,
                                            amount: String(
                                                Number(
                                                    selectedDebt.remainingAmount
                                                ) / 2
                                            )
                                        }))
                                    }
                                >
                                    Half
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setRepayment(current => ({
                                            ...current,
                                            amount: String(
                                                selectedDebt.remainingAmount
                                            )
                                        }))
                                    }
                                >
                                    Pay remaining
                                </button>
                            </div>

                            <label className="debt-form-group">
                                Payment date
                                <input
                                    name="paymentDate"
                                    type="date"
                                    max={todayLocal()}
                                    value={repayment.paymentDate}
                                    onChange={changeRepayment}
                                    required
                                />
                            </label>

                            <label className="debt-form-group">
                                Note (optional)
                                <textarea
                                    name="note"
                                    rows={3}
                                    maxLength={1000}
                                    value={repayment.note}
                                    onChange={changeRepayment}
                                    placeholder="e.g. First installment"
                                />
                            </label>

                            {error && (
                                <p className="debt-error">{error}</p>
                            )}

                            <button
                                type="submit"
                                className="add-debt-button debt-submit"
                                disabled={actionId === selectedDebt.id}
                            >
                                {actionId === selectedDebt.id
                                    ? "Recording repayment..."
                                    : "Confirm repayment"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}

export default DebtSection;
