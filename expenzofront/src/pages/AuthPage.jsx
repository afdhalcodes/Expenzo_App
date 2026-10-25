import { useState } from "react";
import {registerUser,loginUser} from "../services/authService";

const SAMPLE_LEDGER = [
    { title: "Salary", note: "Savings account", amount: "+ ₹ 85,000.00", type: "income" },
    { title: "Rent", note: "Recurring", amount: "− ₹ 22,000.00", type: "expense" },
    { title: "Home loan EMI", note: "Due on the 5th", amount: "− ₹ 18,450.00", type: "expense" },
    { title: "Groceries", note: "Wallet", amount: "− ₹ 3,480.00", type: "expense" },
    { title: "Freelance", note: "Savings account", amount: "+ ₹ 12,000.00", type: "income" }
];

function AuthPage({ onLoginSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    const clearErrors = () => {
        setError("");
        setFieldErrors({});
    };

    const handleError = (error) => {
        setMessage("");
        setError(
            error?.message ||
            "Something went wrong. Please try again."
        );
        setFieldErrors(error?.fieldErrors || {});
    };

    const handleRegister = async (event) => {
        event.preventDefault();
        setMessage("");
        clearErrors();

        try {
            const response = await registerUser(
                username,
                email,
                password
            );

            setMessage(response);
            setUsername("");
            setEmail("");
            setPassword("");
        } catch (error) {
            handleError(error);
        }
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        setMessage("");
        clearErrors();

        try {
            await loginUser(username, password);

            setMessage("Login successful!");
            setUsername("");
            setPassword("");

            onLoginSuccess?.();
        } catch (error) {
            handleError(error);
        }
    };

    const handleUsernameChange = (event) => {
        setUsername(event.target.value);

        if (fieldErrors.username) {
            setFieldErrors((current) => ({
                ...current,
                username: undefined
            }));
        }

        if (error) setError("");
    };

    const handleEmailChange = (event) => {
        setEmail(event.target.value);

        if (fieldErrors.email) {
            setFieldErrors((current) => ({
                ...current,
                email: undefined
            }));
        }

        if (error) setError("");
    };

    const handlePasswordChange = (event) => {
        setPassword(event.target.value);

        if (fieldErrors.password) {
            setFieldErrors((current) => ({
                ...current,
                password: undefined
            }));
        }

        if (error) setError("");
    };

    const switchToRegister = () => {
        setIsLogin(false);
        setUsername("");
        setEmail("");
        setPassword("");
        setMessage("");
        clearErrors();
    };

    const switchToLogin = () => {
        setIsLogin(true);
        setUsername("");
        setEmail("");
        setPassword("");
        setMessage("");
        clearErrors();
    };

    return (
        <div className="auth-container">
            <aside className="auth-showcase">
                <div className="auth-brand">
                    <span className="auth-brand-mark">₹</span>
                    Expenzo
                </div>

                <div className="auth-showcase-copy">
                    <h2 className="auth-showcase-title">
                        Know where every rupee goes.
                    </h2>

                    <p className="auth-showcase-text">
                        Accounts, transactions, loans and
                        recurring bills, together in one place.
                    </p>
                </div>

                <div className="auth-ledger" aria-hidden="true">
                    <div className="auth-ledger-head">
                        <span>Sample ledger</span>
                        <span>This month</span>
                    </div>

                    {SAMPLE_LEDGER.map((row, index) => (
                        <div
                            className="auth-ledger-row"
                            style={{ "--i": index }}
                            key={row.title}
                        >
                            <span
                                className={`auth-ledger-dot ${row.type}`}
                            />

                            <div className="auth-ledger-info">
                                <strong>{row.title}</strong>
                                <small>{row.note}</small>
                            </div>

                            <b className={`auth-ledger-amount ${row.type}`}>
                                {row.amount}
                            </b>
                        </div>
                    ))}
                </div>
            </aside>

            <main className="auth-panel">
                <div className="auth-card">
                    <h1>
                        {isLogin
                            ? "Welcome back"
                            : "Create your account"}
                    </h1>

                    <p className="subtitle">
                        {isLogin
                            ? "Login to manage your expenses"
                            : "Create your Expenzo account"}
                    </p>

                    {isLogin ? (
                        <form onSubmit={handleLogin}>
                            <div className="form-group">
                                <label htmlFor="auth-username">
                                    Username
                                </label>

                                <input
                                    id="auth-username"
                                    className={
                                        fieldErrors.username
                                            ? "input-error"
                                            : ""
                                    }
                                    type="text"
                                    autoComplete="username"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={handleUsernameChange}
                                    required
                                />

                                {fieldErrors.username && (
                                    <p className="field-error">
                                        {fieldErrors.username}
                                    </p>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="auth-password">
                                    Password
                                </label>

                                <input
                                    id="auth-password"
                                    className={
                                        fieldErrors.password
                                            ? "input-error"
                                            : ""
                                    }
                                    type="password"
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={handlePasswordChange}
                                    required
                                />

                                {fieldErrors.password && (
                                    <p className="field-error">
                                        {fieldErrors.password}
                                    </p>
                                )}
                            </div>

                            <button type="submit">Login</button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister}>
                            <div className="form-group">
                                <label htmlFor="auth-username">
                                    Username
                                </label>

                                <input
                                    id="auth-username"
                                    className={
                                        fieldErrors.username
                                            ? "input-error"
                                            : ""
                                    }
                                    type="text"
                                    autoComplete="username"
                                    placeholder="Choose a username"
                                    value={username}
                                    onChange={handleUsernameChange}
                                    required
                                />

                                {fieldErrors.username && (
                                    <p className="field-error">
                                        {fieldErrors.username}
                                    </p>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="auth-email">
                                    Email
                                </label>

                                <input
                                    id="auth-email"
                                    className={
                                        fieldErrors.email
                                            ? "input-error"
                                            : ""
                                    }
                                    type="email"
                                    autoComplete="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={handleEmailChange}
                                    required
                                />

                                {fieldErrors.email && (
                                    <p className="field-error">
                                        {fieldErrors.email}
                                    </p>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="auth-password">
                                    Password
                                </label>

                                <input
                                    id="auth-password"
                                    className={
                                        fieldErrors.password
                                            ? "input-error"
                                            : ""
                                    }
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="Create a password"
                                    value={password}
                                    onChange={handlePasswordChange}
                                    required
                                />

                                {fieldErrors.password && (
                                    <p className="field-error">
                                        {fieldErrors.password}
                                    </p>
                                )}
                            </div>

                            <button type="submit">Register</button>
                        </form>
                    )}

                    {message && (
                        <p className="success-message">{message}</p>
                    )}

                    {error && (
                        <p className="error-message">{error}</p>
                    )}

                    <div className="switch-auth">
                        {isLogin ? (
                            <>
                                <span>Don't have an account?</span>
                                <button
                                    type="button"
                                    onClick={switchToRegister}
                                >
                                    Register
                                </button>
                            </>
                        ) : (
                            <>
                                <span>Already have an account?</span>
                                <button
                                    type="button"
                                    onClick={switchToLogin}
                                >
                                    Login
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default AuthPage;