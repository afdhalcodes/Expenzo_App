
const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:8080";

async function handleResponse(response) {
    // Handle unauthorized responses before reading the body.
    if (response.status === 401) {
        window.dispatchEvent(
            new Event("expenzo:unauthorized")
        );
    }

    const contentType = response.headers.get("content-type") || "";

    let data;

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    if (!response.ok) {
        const message =
            typeof data === "object" && data !== null
                ? data.message || "Request failed."
                : data || "Request failed.";

        const error = new Error(message);
        error.status = response.status;

        throw error;
    }

    return data;
}

async function transactionRequest(path, options = {}) {
    const token = localStorage.getItem("token");

    if (!token) {
        window.dispatchEvent(
            new Event("expenzo:unauthorized")
        );

        const error = new Error(
            "Please log in to manage transactions."
        );

        error.status = 401;
        throw error;
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

    return handleResponse(response);
}

// Fetch all transactions belonging to the logged-in user.
export async function getAllTransactions() {
    return transactionRequest("/api/accounts/all_transactions");
}

// Fetch transactions for one account.
export async function getTransactionsByAccount(accountId) {
    return transactionRequest(
        `/api/accounts/${accountId}/transactions`
    );
}

// Fetch one transaction.
export async function getTransaction(accountId, transactionId) {
    return transactionRequest(
        `/api/accounts/${accountId}/transactions/${transactionId}`
    );
}

// Fetch the latest calculated balance for an account.
export async function getAccountBalance(accountId) {
    return transactionRequest(
        `/api/accounts/${accountId}/transactions/balance`
    );
}

// Create an income or expense transaction.
export async function createTransaction(accountId, transaction) {
    return transactionRequest(
        `/api/accounts/${accountId}/transactions`,
        {
            method: "POST",
            body: JSON.stringify({
                type: transaction.type,
                amount: Number(transaction.amount),
                category: transaction.category?.trim() || "",
                note: transaction.note?.trim() || "",
                transactionDate: transaction.transactionDate
            })
        }
    );
}
