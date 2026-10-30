
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// Add the JWT to every request.
function getAuthHeaders() {
    const token = localStorage.getItem("token");

    return {
        Authorization: `Bearer ${token}`
    };
}

// Send a request and handle errors consistently.
async function request(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        }
    });

    if (response.status === 401) {
        window.dispatchEvent(new Event("expenzo:unauthorized"));
    }

    if (response.status === 204) {
        return null;
    }

    const text = await response.text();
    let data = null;

    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
    }

    if (!response.ok) {
        const message =
            typeof data === "object" && data !== null
                ? data.message || data.error
                : data;

        throw new Error(
            message || `Request failed with status ${response.status}`
        );
    }

    return data;
}

// Build the URL for a specific account.
function getBaseUrl(accountId) {
    return `${API_URL}/api/accounts/${accountId}/recurring-payments`;
}

// Get all recurring payments for an account.
export function getRecurringPayments(accountId) {
    return request(getBaseUrl(accountId));
}

// Create a recurring payment.
export function createRecurringPayment(accountId, payment) {
    return request(getBaseUrl(accountId), {
        method: "POST",
        body: JSON.stringify({
            ...payment,
            amount: Number(payment.amount),
            reminderDaysBefore:
                payment.reminderDaysBefore === ""
                    ? null
                    : Number(payment.reminderDaysBefore)
        })
    });
}

// Update an existing recurring payment.
export function updateRecurringPayment(
    accountId,
    paymentId,
    payment
) {
    return request(`${getBaseUrl(accountId)}/${paymentId}`, {
        method: "PUT",
        body: JSON.stringify({
            ...payment,
            amount: Number(payment.amount),
            reminderDaysBefore:
                payment.reminderDaysBefore === ""
                    ? null
                    : Number(payment.reminderDaysBefore)
        })
    });
}

// Pause a recurring payment.
export function pauseRecurringPayment(accountId, paymentId) {
    return request(
        `${getBaseUrl(accountId)}/${paymentId}/pause`,
        { method: "PATCH" }
    );
}

// Resume a paused recurring payment.
export function resumeRecurringPayment(
    accountId,
    paymentId,
    nextDueDate,
    reminderDaysBefore
) {
    return request(
        `${getBaseUrl(accountId)}/${paymentId}/resume`,
        {
            method: "PATCH",
            body: JSON.stringify({
                nextDueDate,
                reminderDaysBefore:
                    reminderDaysBefore === ""
                        ? null
                        : Number(reminderDaysBefore)
            })
        }
    );
}

// Record a payment through the backend.
export function markRecurringPaymentAsPaid(accountId, paymentId) {
    return request(
        `${getBaseUrl(accountId)}/${paymentId}/pay`,
        { method: "PATCH" }
    );
}

// Delete a recurring payment.
export function deleteRecurringPayment(accountId, paymentId) {
    return request(`${getBaseUrl(accountId)}/${paymentId}`, {
        method: "DELETE"
    });
}
