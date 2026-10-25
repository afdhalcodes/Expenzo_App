const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:8080";

async function parseResponse(response) {
    const contentType =
        response.headers.get("content-type") || "";

    let data;

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    if (!response.ok) {
        if (typeof data === "object" && data !== null) {
            throw {
                status: data.status || response.status,
                code: data.error || "REQUEST_FAILED",
                message: data.message || "Something went wrong.",
                field: data.field || null,
                fieldErrors: data.fieldErrors || {}
            };
        }

        throw {
            status: response.status,
            code: "REQUEST_FAILED",
            message: data || "Something went wrong.",
            field: null,
            fieldErrors: {}
        };
    }

    return data;
}

export async function registerUser(username, email, password) {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                email,
                password
            })
        });

        return await parseResponse(response);
    } catch (error) {
        if (error && typeof error === "object" && error.message) {
            throw error;
        }

        throw {
            status: 0,
            code: "NETWORK_ERROR",
            message: "Unable to connect to the server. Please try again.",
            field: null,
            fieldErrors: {}
        };
    }
}

export async function loginUser(username, password) {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                password
            })
        });

        const token = await parseResponse(response);

        localStorage.setItem("token", token);

        return token;
    } catch (error) {
        if (error && typeof error === "object" && error.message) {
            throw error;
        }

        throw {
            status: 0,
            code: "NETWORK_ERROR",
            message: "Unable to connect to the server. Please try again.",
            field: null,
            fieldErrors: {}
        };
    }
}