
import { useCallback, useEffect, useState } from "react";
import {
    createTransaction,
    getAllTransactions
} from "../services/transactionService";
import "../transaction.css";

function getCurrentDateTime() {
    const now = new Date();
    const localDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 16);
}

function formatAmount(amount) {
    return Number(amount ?? 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(dateValue) {
    if (!dateValue) {
        return "Date unavailable";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function TransactionSection({ accounts, onTransactionAdded }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    const [selectedFilter, setSelectedFilter] = useState("ALL");
    const [accountId, setAccountId] = useState(
        accounts[0]?.id ? String(accounts[0].id) : ""
    );

    const [type, setType] = useState("EXPENSE");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [note, setNote] = useState("");
    const [transactionDate, setTransactionDate] = useState(
        getCurrentDateTime
    );

    // Keep the selected account valid when accounts change.
    useEffect(() => {
        if (accounts.length === 0) {
            setAccountId("");
            return;
        }

        const selectedAccountExists = accounts.some(
            (account) => String(account.id) === accountId
        );

        if (!selectedAccountExists) {
            setAccountId(String(accounts[0].id));
        }
    }, [accounts, accountId]);

    // Load all transactions for the current user.
    const loadTransactions = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await getAllTransactions();
            setTransactions(Array.isArray(data) ? data : []);
        } catch (error) {
            setError(error.message || "Unable to load transactions.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    const filteredTransactions =
        selectedFilter === "ALL"
            ? transactions
            : transactions.filter(
                (transaction) =>
                    String(transaction.accountId) === selectedFilter
            );

    const resetForm = () => {
        setType("EXPENSE");
        setAmount("");
        setCategory("");
        setNote("");
        setTransactionDate(getCurrentDateTime());
        setFormError("");

        if (accounts.length > 0) {
            setAccountId(String(accounts[0].id));
        }
    };

    const handleOpenModal = () => {
        resetForm();
        setShowModal(true);
    };

    const handleCloseModal = () => {
        if (submitting) {
            return;
        }

        setShowModal(false);
        setFormError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormError("");

        if (!accountId) {
            setFormError("Please select an account.");
            return;
        }

        if (!amount || Number(amount) <= 0) {
            setFormError("Amount must be greater than zero.");
            return;
        }

        if (!transactionDate) {
            setFormError("Please select a transaction date.");
            return;
        }

        setSubmitting(true);

        try {
            await createTransaction(Number(accountId), {
                type,
                amount: Number(amount),
                category,
                note,
                transactionDate
            });

            // 1. Reload the transaction list.
            await loadTransactions();

            // 2. Reload the balance shown on each account card.
            await onTransactionAdded?.();

            // 3. Close the form only after the save and refresh.
            setShowModal(false);
            resetForm();
        } catch (error) {
            setFormError(
                error.message || "Unable to add the transaction."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section
            id="transactions"
            className="transactions-section"
        >
            <div className="transactions-section-header">
                <div>
                    <h2>Transactions</h2>
                    <p>Track your income and expenses.</p>
                </div>

                <button
                    className="transaction-add-button"
                    type="button"
                    onClick={handleOpenModal}
                    disabled={accounts.length === 0}
                >
                    + Add Transaction
                </button>
            </div>

            <div className="transactions-toolbar">
                <label htmlFor="transaction-account-filter">
                    Filter by account
                </label>

                <select
                    id="transaction-account-filter"
                    value={selectedFilter}
                    onChange={(event) =>
                        setSelectedFilter(event.target.value)
                    }
                >
                    <option value="ALL">All accounts</option>

                    {accounts.map((account) => (
                        <option
                            key={account.id}
                            value={String(account.id)}
                        >
                            {account.name}
                        </option>
                    ))}
                </select>

                <button
                    className="transaction-refresh-button"
                    type="button"
                    onClick={loadTransactions}
                    disabled={loading}
                >
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {error && (
                <div className="transaction-error">
                    <p>{error}</p>

                    <button
                        type="button"
                        onClick={loadTransactions}
                    >
                        Try again
                    </button>
                </div>
            )}

            {loading && transactions.length === 0 ? (
                <p className="transaction-empty-message">
                    Loading transactions...
                </p>
            ) : !error && filteredTransactions.length === 0 ? (
                <div className="transaction-empty-message">
                    <h3>No transactions found</h3>
                    <p>
                        Add your first income or expense transaction.
                    </p>
                </div>
            ) : (
                <div className="transactions-list">
                    {filteredTransactions.map((transaction) => {
                        const isIncome = transaction.type === "INCOME";

                        return (
                            <article
                                className="transaction-card"
                                key={transaction.id}
                            >
                                <div className="transaction-card-main">
                                    <div
                                        className={
                                            isIncome
                                                ? "transaction-type-icon income"
                                                : "transaction-type-icon expense"
                                        }
                                    >
                                        {isIncome ? "+" : "−"}
                                    </div>

                                    <div className="transaction-details">
                                        <h3>
                                            {transaction.category ||
                                                (isIncome
                                                    ? "Income"
                                                    : "Expense")}
                                        </h3>

                                        <p>
                                            {transaction.note ||
                                                transaction.type}
                                        </p>

                                        <span>
                                            {transaction.accountName}
                                            {" · "}
                                            {formatDate(
                                                transaction.transactionDate
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <strong
                                    className={
                                        isIncome
                                            ? "transaction-amount income-text"
                                            : "transaction-amount expense-text"
                                    }
                                >
                                    {isIncome ? "+" : "−"}
                                    {" "}
                                    {transaction.currency}{" "}
                                    {formatAmount(transaction.amount)}
                                </strong>
                            </article>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <div
                    className="transaction-modal-overlay"
                    onClick={handleCloseModal}
                >
                    <div
                        className="transaction-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="transaction-modal-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            className="transaction-modal-close"
                            type="button"
                            aria-label="Close"
                            onClick={handleCloseModal}
                            disabled={submitting}
                        >
                            ×
                        </button>

                        <div className="transaction-modal-heading">
                            <h2 id="transaction-modal-title">
                                Add Transaction
                            </h2>

                            <p>
                                Record money coming in or going out.
                            </p>
                        </div>

                        <form
                            className="transaction-form"
                            onSubmit={handleSubmit}
                        >
                            <div className="transaction-form-field">
                                <label htmlFor="transaction-account">
                                    Account
                                </label>

                                <select
                                    id="transaction-account"
                                    value={accountId}
                                    onChange={(event) =>
                                        setAccountId(event.target.value)
                                    }
                                    required
                                >
                                    <option value="">
                                        Select an account
                                    </option>

                                    {accounts.map((account) => (
                                        <option
                                            key={account.id}
                                            value={String(account.id)}
                                        >
                                            {account.name} ({account.currency})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="transaction-form-field">
                                <label htmlFor="transaction-type">
                                    Transaction Type
                                </label>

                                <select
                                    id="transaction-type"
                                    value={type}
                                    onChange={(event) =>
                                        setType(event.target.value)
                                    }
                                    required
                                >
                                    <option value="EXPENSE">Expense</option>
                                    <option value="INCOME">Income</option>
                                </select>
                            </div>

                            <div className="transaction-form-field">
                                <label htmlFor="transaction-amount">
                                    Amount
                                </label>

                                <input
                                    id="transaction-amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={amount}
                                    onChange={(event) =>
                                        setAmount(event.target.value)
                                    }
                                    placeholder="Enter amount"
                                    required
                                />
                            </div>

                            <div className="transaction-form-field">
                                <label htmlFor="transaction-category">
                                    Category
                                </label>

                                <input
                                    id="transaction-category"
                                    type="text"
                                    value={category}
                                    onChange={(event) =>
                                        setCategory(event.target.value)
                                    }
                                    placeholder="e.g. Food, Salary, Travel"
                                />
                            </div>

                            <div className="transaction-form-field">
                                <label htmlFor="transaction-note">
                                    Note
                                </label>

                                <textarea
                                    id="transaction-note"
                                    value={note}
                                    onChange={(event) =>
                                        setNote(event.target.value)
                                    }
                                    placeholder="Optional note"
                                    rows="3"
                                />
                            </div>

                            <div className="transaction-form-field">
                                <label htmlFor="transaction-date">
                                    Transaction Date
                                </label>

                                <input
                                    id="transaction-date"
                                    type="datetime-local"
                                    value={transactionDate}
                                    onChange={(event) =>
                                        setTransactionDate(event.target.value)
                                    }
                                    required
                                />
                            </div>

                            {formError && (
                                <p className="transaction-form-error">
                                    {formError}
                                </p>
                            )}

                            <div className="transaction-form-actions">
                                <button
                                    className="transaction-cancel-button"
                                    type="button"
                                    onClick={handleCloseModal}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>

                                <button
                                    className="transaction-submit-button"
                                    type="submit"
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? "Saving..."
                                        : "Save Transaction"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}

export default TransactionSection;
