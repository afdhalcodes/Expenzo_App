
import { useCallback, useEffect, useState } from "react";
import {
    getLoans,
    createLoan,
    getNextLoanPayment,
    payLoan,
    getLoanPaymentHistory
} from "../services/loanService";

const EMPTY_FORM = {
    accountId: "",
    title: "",
    loanType: "PERSONAL_LOAN",
    totalCost: "",
    initialPayment: "0",
    interestRate: "",
    tenureMonths: "",
    startDate: new Date().toISOString().slice(0, 10),
    nextDueDate: "",
    note: ""
};

function money(amount, currency = "INR") {
    return `${currency} ${Number(amount ?? 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function dateLabel(value) {
    if (!value) return "Not set";

    const date = new Date(`${value.slice(0, 10)}T00:00:00`);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric"
          });
}

function LoanSection({ accounts = [], onLoanPayment }) {
    const [loans, setLoans] = useState([]);
    const [filter, setFilter] = useState("ALL");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [actionId, setActionId] = useState(null);

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    const [historyLoan, setHistoryLoan] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const loadLoans = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const results = await Promise.all(
                accounts.map(async account => {
                    const data = await getLoans(account.id);

                    return (Array.isArray(data) ? data : []).map(loan => ({
                        ...loan,
                        accountId: loan.accountId ?? account.id,
                        accountName: account.name,
                        currency: account.currency || "INR"
                    }));
                })
            );

            setLoans(results.flat());
        } catch (err) {
            setError(err.message || "Unable to load loans.");
        } finally {
            setLoading(false);
        }
    }, [accounts]);

    useEffect(() => {
        loadLoans();
    }, [loadLoans]);

    useEffect(() => {
        if (
            filter !== "ALL" &&
            !accounts.some(account => String(account.id) === filter)
        ) {
            setFilter("ALL");
        }
    }, [accounts, filter]);

    function changeField(event) {
        const { name, value } = event.target;

        setForm(current => ({
            ...current,
            [name]: value
        }));
    }

    function openCreateForm() {
        setForm({
            ...EMPTY_FORM,
            accountId: accounts[0] ? String(accounts[0].id) : "",
            startDate: new Date().toISOString().slice(0, 10)
        });
        setError("");
        setShowForm(true);
    }

    async function handleCreate(event) {
        event.preventDefault();
        setError("");

        if (!form.accountId) {
            setError("Please select an account.");
            return;
        }

        if (Number(form.totalCost) <= 0) {
            setError("Total cost must be greater than zero.");
            return;
        }

        if (
            Number(form.initialPayment) < 0 ||
            Number(form.initialPayment) >= Number(form.totalCost)
        ) {
            setError(
                "Initial payment must be zero or less than the total cost."
            );
            return;
        }

        if (
            Number(form.interestRate) < 0 ||
            Number(form.tenureMonths) <= 0
        ) {
            setError("Enter a valid interest rate and loan tenure.");
            return;
        }

        if (!form.startDate || !form.nextDueDate) {
            setError("Please enter the start date and next due date.");
            return;
        }

        setSaving(true);

        try {
            await createLoan(Number(form.accountId), {
                title: form.title.trim(),
                loanType: form.loanType,
                totalCost: form.totalCost,
                initialPayment: form.initialPayment,
                interestRate: form.interestRate,
                tenureMonths: form.tenureMonths,
                startDate: form.startDate,
                nextDueDate: form.nextDueDate,
                note: form.note.trim()
            });

            setShowForm(false);
            await loadLoans();
        } catch (err) {
            setError(err.message || "Unable to create the loan.");
        } finally {
            setSaving(false);
        }
    }

    
    async function handlePay(loan) {
        if (
            !window.confirm(
                `Record the next EMI payment for "${loan.title}"?`
            )
        ) {
            return;
        }

        setActionId(loan.id);
        setError("");

        try {
            const preview = await getNextLoanPayment(
                loan.accountId,
                loan.id
            );

            const payment = await payLoan(
                loan.accountId,
                loan.id,
                preview.dueDate
            );

            // 1. Update the loan section immediately.
            await loadLoans();

            // 2. Notify the Transactions section to reload transactions
            // and refresh account balances without reloading the page.
            window.dispatchEvent(
                new CustomEvent("expenzo:transactions-updated", {
                    detail: {
                        accountId: loan.accountId
                    }
                })
            );

            // 3. Keep any existing parent refresh callback.
            await onLoanPayment?.(payment, loan);

        } catch (err) {
            setError(
                err.message || "Unable to record the loan payment."
            );
        } finally {
            setActionId(null);
        }
    }


    async function openHistory(loan) {
        setHistoryLoan(loan);
        setHistory([]);
        setHistoryLoading(true);
        setError("");

        try {
            const data = await getLoanPaymentHistory(
                loan.accountId,
                loan.id
            );

            setHistory(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || "Unable to load payment history.");
        } finally {
            setHistoryLoading(false);
        }
    }

    const visibleLoans =
        filter === "ALL"
            ? loans
            : loans.filter(loan => String(loan.accountId) === filter);

    return (
        <section className="loans-section" id="loans">
            <div className="loans-section-header">
                <div>
                    <h2>Loans</h2>
                    <p>Track EMI payments and outstanding balances.</p>
                </div>

                <button
                    className="primary-action"
                    type="button"
                    onClick={openCreateForm}
                    disabled={accounts.length === 0}
                >
                    + Add Loan
                </button>
            </div>

            <div className="section-toolbar">
                <label htmlFor="loan-account-filter">Account</label>

                <select
                    id="loan-account-filter"
                    value={filter}
                    onChange={event => setFilter(event.target.value)}
                >
                    <option value="ALL">All accounts</option>

                    {accounts.map(account => (
                        <option key={account.id} value={String(account.id)}>
                            {account.name}
                        </option>
                    ))}
                </select>
            </div>

            {error && <p className="error-message">{error}</p>}

            {loading ? (
                <p className="loading-message">Loading loans...</p>
            ) : visibleLoans.length === 0 ? (
                <div className="empty-state">
                    <h3>No loans found</h3>
                    <p>Create a loan to start tracking your EMI payments.</p>
                </div>
            ) : (
                <div className="loan-grid">
                    {visibleLoans.map(loan => (
                        <article className="loan-card" key={loan.id}>
                            <div className="loan-card-top">
                                <div>
                                    <span className="eyebrow">
                                        {String(loan.loanType || "")
                                            .replaceAll("_", " ")}
                                    </span>

                                    <h3>{loan.title}</h3>
                                    <p>{loan.accountName}</p>
                                </div>

                                <span
                                    className={`status-pill ${String(
                                        loan.status || "ACTIVE"
                                    ).toLowerCase()}`}
                                >
                                    {loan.status || "ACTIVE"}
                                </span>
                            </div>

                            <div className="loan-amount">
                                <span>Outstanding principal</span>
                                <strong>
                                    {money(
                                        loan.outstandingPrincipal,
                                        loan.currency
                                    )}
                                </strong>
                            </div>

                            <div className="loan-details">
                                <div>
                                    <span>EMI amount</span>
                                    <strong>
                                        {money(loan.emiAmount, loan.currency)}
                                    </strong>
                                </div>

                                <div>
                                    <span>Interest rate</span>
                                    <strong>{loan.interestRate}%</strong>
                                </div>

                                <div>
                                    <span>Next due date</span>
                                    <strong>{dateLabel(loan.nextDueDate)}</strong>
                                </div>

                                <div>
                                    <span>Tenure</span>
                                    <strong>{loan.tenureMonths} months</strong>
                                </div>
                            </div>

                            {loan.note && <p className="loan-note">{loan.note}</p>}

                            <div className="loan-actions">
                                <button
                                    type="button"
                                    className="primary-action"
                                    disabled={
                                        actionId === loan.id ||
                                        String(loan.status).toUpperCase() !==
                                            "ACTIVE"
                                    }
                                    onClick={() => handlePay(loan)}
                                >
                                    {actionId === loan.id
                                        ? "Processing..."
                                        : "Pay next EMI"}
                                </button>

                                <button
                                    type="button"
                                    className="secondary-action"
                                    onClick={() => openHistory(loan)}
                                >
                                    Payment history
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {showForm && (
                <div
                    className="modal-overlay"
                    role="presentation"
                    onMouseDown={event => {
                        if (event.target === event.currentTarget && !saving) {
                            setShowForm(false);
                        }
                    }}
                >
                    <div
                        className="loan-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="loan-form-title"
                    >
                        <button
                            className="modal-close-button"
                            type="button"
                            disabled={saving}
                            onClick={() => setShowForm(false)}
                            aria-label="Close"
                        >
                            ×
                        </button>

                        <h2 id="loan-form-title">Add a loan</h2>
                        <p className="modal-subtitle">
                            Enter the loan details to calculate and track EMIs.
                        </p>

                        <form onSubmit={handleCreate} className="loan-form">
                            <label className="form-group">
                                Account
                                <select
                                    name="accountId"
                                    value={form.accountId}
                                    onChange={changeField}
                                    required
                                >
                                    {accounts.map(account => (
                                        <option
                                            key={account.id}
                                            value={String(account.id)}
                                        >
                                            {account.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="form-group">
                                Loan title
                                <input
                                    name="title"
                                    value={form.title}
                                    onChange={changeField}
                                    placeholder="e.g. Bike loan"
                                    required
                                />
                            </label>

                            <label className="form-group">
                                Loan type
                                <select
                                    name="loanType"
                                    value={form.loanType}
                                    onChange={changeField}
                                >
                                    {[
                                        "HOME_LOAN",
                                        "CAR_LOAN",
                                        "BIKE_LOAN",
                                        "PERSONAL_LOAN",
                                        "EDUCATION_LOAN",
                                        "GOLD_LOAN",
                                        "OTHER"
                                    ].map(type => (
                                        <option key={type} value={type}>
                                            {type.replaceAll("_", " ")}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className="loan-form-grid">
                                <label className="form-group">
                                    Total cost
                                    <input
                                        name="totalCost"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={form.totalCost}
                                        onChange={changeField}
                                        required
                                    />
                                </label>

                                <label className="form-group">
                                    Initial payment
                                    <input
                                        name="initialPayment"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.initialPayment}
                                        onChange={changeField}
                                        required
                                    />
                                </label>

                                <label className="form-group">
                                    Interest rate (% per year)
                                    <input
                                        name="interestRate"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.interestRate}
                                        onChange={changeField}
                                        required
                                    />
                                </label>

                                <label className="form-group">
                                    Tenure (months)
                                    <input
                                        name="tenureMonths"
                                        type="number"
                                        min="1"
                                        value={form.tenureMonths}
                                        onChange={changeField}
                                        required
                                    />
                                </label>

                                <label className="form-group">
                                    Start date
                                    <input
                                        name="startDate"
                                        type="date"
                                        value={form.startDate}
                                        onChange={changeField}
                                        required
                                    />
                                </label>

                                <label className="form-group">
                                    First EMI due date
                                    <input
                                        name="nextDueDate"
                                        type="date"
                                        value={form.nextDueDate}
                                        onChange={changeField}
                                        required
                                    />
                                </label>
                            </div>

                            <label className="form-group">
                                Note (optional)
                                <input
                                    name="note"
                                    value={form.note}
                                    onChange={changeField}
                                    placeholder="Additional details"
                                />
                            </label>

                            {error && <p className="error-message">{error}</p>}

                            <button
                                type="submit"
                                className="primary-action full-width"
                                disabled={saving}
                            >
                                {saving ? "Creating loan..." : "Create loan"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {historyLoan && (
                <div className="modal-overlay">
                    <div className="loan-modal" role="dialog" aria-modal="true">
                        <button
                            className="modal-close-button"
                            type="button"
                            onClick={() => setHistoryLoan(null)}
                            aria-label="Close"
                        >
                            ×
                        </button>

                        <h2>{historyLoan.title}</h2>
                        <p className="modal-subtitle">Payment history</p>

                        {historyLoading ? (
                            <p className="loading-message">
                                Loading payment history...
                            </p>
                        ) : history.length === 0 ? (
                            <div className="empty-state">
                                No payments recorded yet.
                            </div>
                        ) : (
                            <div className="payment-history-list">
                                {history.map(payment => (
                                    <div
                                        className="payment-history-row"
                                        key={payment.id}
                                    >
                                        <div>
                                            <strong>
                                                {money(
                                                    payment.amount,
                                                    historyLoan.currency
                                                )}
                                            </strong>
                                            <p>
                                                {dateLabel(payment.paymentDate)}
                                            </p>
                                            {payment.note && <p>{payment.note}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}

export default LoanSection;
