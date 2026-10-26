import { useState } from "react";
import { createAccount } from "../services/accountService";

function AccountSetup({onAccountCreated,isAdditionalAccount = false}) 
{
    const [name, setName] = useState("Wallet");
    const [openingBalance, setOpeningBalance] = useState("");
    const [currency, setCurrency] = useState("INR");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            const account = await createAccount(
                name,
                openingBalance || 0,
                currency
            );

            onAccountCreated(account);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const content = (
        <div className="account-setup">
            <div className="account-setup-header">
                <h2>
                    {isAdditionalAccount
                        ? "Add Account"
                        : "Welcome to Expenzo"}
                </h2>

                <p>
                    {isAdditionalAccount
                        ? "Add another account to manage your money."
                        : "Let's create your first account."}
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="setup-name">
                        Account Name
                    </label>

                    <input
                        id="setup-name"
                        type="text"
                        placeholder="Enter account name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="setup-balance">
                        Opening Balance
                    </label>

                    <input
                        id="setup-balance"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Enter opening balance"
                        value={openingBalance}
                        onChange={(event) =>
                            setOpeningBalance(event.target.value)
                        }
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="setup-currency">
                        Currency
                    </label>

                    <select
                        id="setup-currency"
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value)}
                    >
                        <option value="INR">INR - Indian Rupee</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                    </select>
                </div>

                {error && (
                    <p className="error-message">{error}</p>
                )}

                <button
                    className="create-account-button"
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Creating..." : "Create Account"}
                </button>
            </form>
        </div>
    );

    if (isAdditionalAccount) {
        return content;
    }

    return (
        <div className="setup-page">
            <div className="setup-card">
                <div className="setup-brand">
                    <span className="auth-brand-mark">₹</span>
                    Expenzo
                </div>

                {content}
            </div>
        </div>
    );
}

export default AccountSetup;