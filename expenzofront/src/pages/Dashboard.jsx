
import { useEffect, useState } from "react";

import AccountSection from "../components/AccountSection";
import RecurringPaymentSection from "../components/RecurringPaymentSection";
import LoanSection from "../components/LoanSection";
import { getAccounts } from "../services/accountService";

function Dashboard({ onLogout }) {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadAccounts() {
        setLoading(true);
        setError("");

        try {
            const data = await getAccounts();
            setAccounts(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || "Unable to load accounts.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAccounts();
    }, []);

    return (
        <>
            <AccountSection onLogout={onLogout} />

            <main className="dashboard-content">
                {loading ? (
                    <p className="loading-message">
                        Loading your account information...
                    </p>
                ) : error ? (
                    <div className="error-message">
                        {error}
                        <button
                            className="secondary-action"
                            type="button"
                            onClick={loadAccounts}
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <>
                        <div id="recurring" className="dashboard-block">
                            <RecurringPaymentSection accounts={accounts} />
                        </div>

                        <div id="loans" className="dashboard-block">
                            <LoanSection accounts={accounts} />
                        </div>
                    </>
                )}
            </main>
        </>
    );
}

export default Dashboard;
