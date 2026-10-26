const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:8080";

async function handleResponse(response) {
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

        throw new Error(message);
    }

    return data;
}

async function accountRequest(path, options = {}) {
    const token = localStorage.getItem("token");

    if (!token) {
        throw new Error("Please log in to manage your accounts.");
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

export async function getAccounts() {
    return accountRequest("/api/accounts");
}

export async function createAccount(name, openingBalance, currency) {
    return accountRequest("/api/accounts", {
        method: "POST",
        body: JSON.stringify({
            name: name.trim(),
            openingBalance: Number(openingBalance || 0),
            currency
        })
    });
}

export async function getAccount(accountId) {
    return accountRequest(`/api/accounts/${accountId}`);
}

export async function updateOpeningBalance(accountId, openingBalance) {
    return accountRequest(
        `/api/accounts/${accountId}/opening-balance`,
        {
            method: "PUT",
            body: JSON.stringify({
                openingBalance: Number(openingBalance)
            })
        }
    );
}