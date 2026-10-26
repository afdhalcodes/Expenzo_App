
import { useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage";
import AccountSection from "./components/AccountSection";
import "./auth.css";

function App() {
    const [authenticated, setAuthenticated] = useState(
        () => Boolean(localStorage.getItem("token"))
    );

    useEffect(() => {
        const handleUnauthorized = () => {
            localStorage.removeItem("token");
            setAuthenticated(false);
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
    }, []);

    const handleLoginSuccess = () => {
        setAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        setAuthenticated(false);
    };

    if (!authenticated) {
        return (
            <AuthPage onLoginSuccess={handleLoginSuccess} />
        );
    }

    return <AccountSection onLogout={handleLogout} />;
}

export default App;
