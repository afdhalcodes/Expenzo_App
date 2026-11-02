
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

async function request(path, options = {}) {
    const token = localStorage.getItem("token");

    if (!token) {
        window.dispatchEvent(new Event("expenzo:unauthorized"));
        throw new Error("Please log in to manage debts.");
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
        throw new Error("Unable to connect to the server. Please try again.");
    }

    if (response.status === 401) {
        window.dispatchEvent(new Event("expenzo:unauthorized"));
    }

    if (response.status === 204) {
        if (!response.ok) {
            throw new Error("The debt request failed.");
        }
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
                ? data.message || data.error || "Debt request failed."
                : data || "Debt request failed.";

        throw new Error(message);
    }

    return data;
}

// GET /api/debts
export function getDebts() {
    return request("/api/debts");
}

// POST /api/debts?accountId=1
export function createDebt(accountId, debt) {
    return request(
        `/api/debts?accountId=${encodeURIComponent(accountId)}`,
        {
            method: "POST",
            body: JSON.stringify({
                personName: debt.personName.trim(),
                title: debt.title.trim(),
                amount: Number(debt.amount),
                firstReminderDate: debt.firstReminderDate,
                note: debt.note.trim() || null
            })
        }
    );
}

// POST /api/debts/{debtId}/repay
export function repayDebt(debtId, repayment) {
    return request(`/api/debts/${debtId}/repay`, {
        method: "POST",
        body: JSON.stringify({
            amount: Number(repayment.amount),
            paymentDate: repayment.paymentDate,
            note: repayment.note.trim() || null
        })
    });
}

// DELETE /api/debts/{debtId}
export function deleteDebt(debtId) {
    return request(`/api/debts/${debtId}`, {
        method: "DELETE"
    });
}
