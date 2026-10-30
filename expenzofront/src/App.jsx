
import { useEffect } from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useNavigate
} from "react-router-dom";

import AuthPage from "./pages/AuthPage";
import AccountSetup from "./pages/AccountSetup";
import Dashboard from "./pages/Dashboard";

import { getAccounts } from "./services/accountService";
import "./auth.css";

// Check whether the token exists and has not expired.
function isTokenValid() {
    const token = localStorage.getItem("token");

    if (!token) {
        return false;
    }

    try {
        const parts = token.split(".");

        if (parts.length !== 3) {
            localStorage.removeItem("token");
            return false;
        }

        const base64Payload = parts[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const paddedPayload = base64Payload.padEnd(
            base64Payload.length +
                ((4 - (base64Payload.length % 4)) % 4),
            "="
        );

        const payload = JSON.parse(atob(paddedPayload));

        if (
            typeof payload.exp !== "number" ||
            payload.exp <= Date.now() / 1000
        ) {
            localStorage.removeItem("token");
            return false;
        }

        return true;
    } catch {
        localStorage.removeItem("token");
        return false;
    }
}

// Prevent users without a valid token from opening protected pages.
function ProtectedRoute({ children }) {
    if (!isTokenValid()) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function AppRoutes() {
    const navigate = useNavigate();

    // Redirect to login whenever an API reports an unauthorized session.
    useEffect(() => {
        const handleUnauthorized = () => {
            localStorage.removeItem("token");
            navigate("/login", { replace: true });
        };

        window.addEventListener(
            "expenzo:unauthorized",
            handleUnauthorized
        );

        return () => {
            window.removeEventListener(
                "expenzo:unauthorized",
                handleUnauthorized
            );
        };
    }, [navigate]);

    // After login, check whether the user has created an account.
    const handleLoginSuccess = async () => {
        try {
            const accounts = await getAccounts();

            if (accounts.length === 0) {
                navigate("/setup-account", { replace: true });
            } else {
                navigate("/dashboard", { replace: true });
            }
        } catch (error) {
            console.error("Unable to load accounts:", error);
            // A 401 response is handled by the unauthorized listener.
        }
    };

    const handleAccountCreated = () => {
        navigate("/dashboard", { replace: true });
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
    };

    return (
        <Routes>
            <Route
                path="/"
                element={
                    <Navigate
                        to={isTokenValid() ? "/dashboard" : "/login"}
                        replace
                    />
                }
            />

            <Route
                path="/login"
                element={
                    isTokenValid() ? (
                        <Navigate to="/dashboard" replace />
                    ) : (
                        <AuthPage
                            onLoginSuccess={handleLoginSuccess}
                        />
                    )
                }
            />

            <Route
                path="/setup-account"
                element={
                    <ProtectedRoute>
                        <AccountSetup
                            onAccountCreated={handleAccountCreated}
                        />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard onLogout={handleLogout} />
                    </ProtectedRoute>
                }
            />

            <Route
                path="*"
                element={<Navigate to="/" replace />}
            />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}

export default App;
