
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

async function request(path, options = {}) {
    const token = localStorage.getItem("token");

    if (!token) {
        window.dispatchEvent(new Event("expenzo:unauthorized"));
        throw new Error("Please log in to manage loans.");
    }

    let response;

    try {
        response = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                ...(options.body
                    ? { "Content-Type": "application/json" }
                    : {}),
                ...options.headers,
                Authorization: `Bearer ${token}`
            }
        });
    } catch {
        throw new Error(
            "Unable to connect to the server. Please try again."
        );
    }

    if (response.status === 401) {
        window.dispatchEvent(new Event("expenzo:unauthorized"));
    }

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get("content-type") || "";
    let data = null;

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    if (!response.ok) {
        const message =
            typeof data === "object" && data !== null
                ? data.message || data.error || "Loan request failed."
                : data || "Loan request failed.";

        throw new Error(message);
    }

    return data;
}

function loanUrl(accountId, suffix = "") {
    return `/api/accounts/${accountId}/loans${suffix}`;
}

export function getLoans(accountId) {
    return request(loanUrl(accountId));
}

export function createLoan(accountId, loan) {
    return request(loanUrl(accountId), {
        method: "POST",
        body: JSON.stringify({
            ...loan,
            totalCost: Number(loan.totalCost),
            initialPayment: Number(loan.initialPayment || 0),
            interestRate: Number(loan.interestRate),
            tenureMonths: Number(loan.tenureMonths)
        })
    });
}

export function getNextLoanPayment(accountId, loanId) {
    return request(
        loanUrl(accountId, `/${loanId}/next-payment`)
    );
}

export function payLoan(accountId, loanId, paymentDate, note = "") {
    return request(
        loanUrl(accountId, `/${loanId}/pay`),
        {
            method: "POST",
            body: JSON.stringify({
                paymentDate,
                note
            })
        }
    );
}

export function getLoanPaymentHistory(accountId, loanId) {
    return request(
        loanUrl(accountId, `/${loanId}/payments`)
    );
}
