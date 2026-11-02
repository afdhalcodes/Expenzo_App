import { useCallback, useEffect, useState } from "react";

import AccountSection from "../components/AccountSection";
import RecurringPaymentSection from "../components/RecurringPaymentSection";
import LoanSection from "../components/LoanSection";
import DebtSection from "../components/DebtSection";
import DashboardStatistics from "../components/statistics/DashboardStatistics";

import { getAccounts } from "../services/accountService";

function Dashboard() {
    const [accounts, setAccounts] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [accountsError, setAccountsError] = useState("");

    // Load accounts for the loan, debt, and recurring-payment sections.
    const loadAccounts = useCallback(async () => {
        try {
            setAccountsError("");

            const data = await getAccounts();

            setAccounts(Array.isArray(data) ? data : []);
        } catch (error) {
            setAccountsError(
                error.message || "Unable to load accounts."
            );
        }
    }, []);

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]);

    // Refresh dashboard statistics and related sections after a change.
    const handleDataChanged = useCallback(() => {
        setRefreshKey((previous) => previous + 1);
        loadAccounts();
    }, [loadAccounts]);

    return (
        <div className="dashboard-page">
            {/* Financial overview and charts */}
            <main className="dashboard-content">
                <section
                    id="overview"
                    className="dashboard-block"
                >
                    <DashboardStatistics
                        refreshKey={refreshKey}
                    />
                </section>

                {/* Accounts and transactions.
                    AccountSection already renders its own header,
                    notification panel, and transaction section. */}
                <section
                    id="accounts"
                    className="dashboard-block"
                >
                    <AccountSection />
                </section>

                {/* Show account-loading errors for the sections below. */}
                {accountsError && (
                    <div className="account-load-error">
                        <p className="error-message">
                            {accountsError}
                        </p>

                        <button
                            className="account-retry-link"
                            type="button"
                            onClick={loadAccounts}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Loans */}
                <section
                    id="loans"
                    className="dashboard-block"
                >
                    <LoanSection
                        accounts={accounts}
                        onDataChanged={handleDataChanged}
                        refreshKey={refreshKey}
                    />
                </section>

                {/* Debts */}
                <section
                    id="debts"
                    className="dashboard-block"
                >
                    <DebtSection
                        accounts={accounts}
                        onDataChanged={handleDataChanged}
                        refreshKey={refreshKey}
                    />
                </section>

                {/* Recurring payments */}
                <section
                    id="recurring"
                    className="dashboard-block"
                >
                    <RecurringPaymentSection
                        accounts={accounts}
                        onDataChanged={handleDataChanged}
                        refreshKey={refreshKey}
                    />
                </section>
            </main>
        </div>
    );
}

export default Dashboard;