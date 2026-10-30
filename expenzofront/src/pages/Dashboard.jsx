
import { useEffect, useState } from "react";

import AccountSection from "../components/AccountSection";
import RecurringPaymentSection from "../components/RecurringPaymentSection";
import { getAccounts } from "../services/accountService";

function Dashboard({ onLogout }) {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Load the accounts for recurring payments.
    useEffect(() => {
        async function loadAccounts() {
            try {
                const data = await getAccounts();
                setAccounts(data);
            } catch (error) {
                setError(error.message || "Unable to load accounts.");
            } finally {
                setLoading(false);
            }
        }

        loadAccounts();
    }, []);

    return (
        <>
            {/* Existing account and transaction UI */}
            <AccountSection onLogout={onLogout} />

            {/* Recurring payment section */}
            <main className="dashboard-content">
                <div
                    id="recurring"
                    className="dashboard-block"
                >
                    {loading ? (
                        <p>Loading recurring payment accounts...</p>
                    ) : error ? (
                        <p className="error-message">{error}</p>
                    ) : (
                        <RecurringPaymentSection
                            accounts={accounts}
                        />
                    )}
                </div>
            </main>
        </>
    );
}

export default Dashboard;
