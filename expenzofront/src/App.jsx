import AuthPage from "./pages/AuthPage";
import "./auth.css";

function App() {
    const handleLoginSuccess = () => {
        console.log("Login successful");
    };

    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
}

export default App;