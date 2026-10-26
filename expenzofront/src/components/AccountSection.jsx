
import { useCallback, useEffect, useState } from "react";
import AccountSetup from "../pages/AccountSetup";
import { getAccounts } from "../services/accountService";
import { getAccountBalance } from "../services/transactionService";
import TransactionSection from "./TransactionSection";

function formatAmount(amount) {
    return Number(amount ?? 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function AccountSection({ onLogout }) {
    const [accounts, setAccounts] = useState([]);
    const [balances, setBalances] = useState({});
    const [showAccountSetup, setShowAccountSetup] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Fetch the latest balance for every account.
    const loadBalances = useCallback(async (accountList) => {
        const results = await Promise.all(
            accountList.map(async (account) => {
                try {
                    const balanceResponse = await getAccountBalance(
                        account.id
                    );

                    return [
                        account.id,
                        Number(
                            balanceResponse.currentBalance ??
                            account.openingBalance ??
                            0
                        )
                    ];
                } catch (error) {
                    console.error(
                        `Unable to load balance for account ${account.id}:`,
                        error
                    );

                    return [
                        account.id,
                        Number(account.openingBalance ?? 0)
                    ];
                }
            })
        );

        setBalances(Object.fromEntries(results));
    }, []);

    // Fetch accounts and their current balances.
    const loadAccounts = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await getAccounts();

            setAccounts(data);
            await loadBalances(data);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [loadBalances]);

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]);

    // Called after creating an account.
    const handleAccountCreated = async () => {
        setShowAccountSetup(false);
        await loadAccounts();
    };

    // Called after a transaction is created.
    const handleTransactionAdded = async () => {
        await loadBalances(accounts);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        onLogout?.();
    };

    if (loading) {
        return (
            <div className="accounts-loading-page">
                <p className="loading-message">Loading accounts...</p>
            </div>
        );
    }

    if (error && accounts.length === 0) {
        return (
            <div className="accounts-loading-page">
                <p className="error-message">{error}</p>

                <button
                    className="create-account-button accounts-retry-button"
                    type="button"
                    onClick={loadAccounts}
                >
                    Retry
                </button>
            </div>
        );
    }

    // First-time setup: preserve the original account setup page.
    if (accounts.length === 0) {
        return (
            <AccountSetup
                onAccountCreated={handleAccountCreated}
            />
        );
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="dashboard-header-content">
                    <a className="dashboard-brand" href="#accounts">
                        <span className="auth-brand-mark">₹</span>
                        <h1>Expenzo</h1>
                    </a>

                    <div className="accounts-header-actions">
                        <span className="accounts-header-label">
                            My Accounts
                        </span>

                        <button
                            className="logout-button"
                            type="button"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="dashboard-content">
                <div id="accounts" className="dashboard-block">
                    <div className="accounts-section">
                        <div className="accounts-section-header">
                            <div>
                                <h2>My Accounts</h2>
                                <p>
                                    Manage your money across different accounts
                                </p>
                            </div>

                            <button
                                className="add-account-button"
                                type="button"
                                onClick={() => setShowAccountSetup(true)}
                            >
                                + Add Account
                            </button>
                        </div>

                        {error && (
                            <div className="account-load-error">
                                <p className="error-message">{error}</p>

                                <button
                                    className="account-retry-link"
                                    type="button"
                                    onClick={loadAccounts}
                                >
                                    Try again
                                </button>
                            </div>
                        )}

                        {accounts.length > 0 && (
                            <div className="accounts-grid">
                                {accounts.map((account) => (
                                    <div
                                        className="account-card"
                                        key={account.id}
                                    >
                                        <div className="account-card-top">
                                            <div className="account-icon">
                                                ₹
                                            </div>

                                            <div className="account-info">
                                                <h3>{account.name}</h3>
                                                <span>{account.currency}</span>
                                            </div>
                                        </div>

                                        <div className="account-balance">
                                            <span>Current Balance</span>

                                            <strong>
                                                {account.currency}{" "}
                                                {formatAmount(
                                                    balances[account.id] ??
                                                    account.openingBalance
                                                )}
                                            </strong>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Transactions are displayed below the account cards. */}
                <TransactionSection
                    accounts={accounts}
                    onTransactionAdded={handleTransactionAdded}
                />
            </main>

            {showAccountSetup && (
                <div
                    className="modal-overlay"
                    onClick={() => setShowAccountSetup(false)}
                >
                    <div
                        className="account-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            className="modal-close-button"
                            type="button"
                            aria-label="Close"
                            onClick={() => setShowAccountSetup(false)}
                        >
                            ×
                        </button>

                        <AccountSetup
                            onAccountCreated={handleAccountCreated}
                            isAdditionalAccount={true}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default AccountSection;
