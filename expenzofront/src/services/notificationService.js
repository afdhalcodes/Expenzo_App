
const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:8080";

function getToken() {
    return localStorage.getItem("token");
}

function dispatchUnauthorized() {
    window.dispatchEvent(
        new Event("expenzo:unauthorized")
    );
}

async function handleResponse(response, defaultMessage) {
    if (response.status === 401) {
        dispatchUnauthorized();
    }

    const contentType =
        response.headers.get("content-type") || "";

    let data;

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    if (!response.ok) {
        const message =
            typeof data === "object" && data !== null
                ? data.message || defaultMessage
                : data || defaultMessage;

        const error = new Error(message);
        error.status = response.status;

        throw error;
    }

    return data;
}

async function notificationRequest(path, options = {}) {
    const token = getToken();

    if (!token) {
        dispatchUnauthorized();

        const error = new Error(
            "Your session has expired. Please log in again."
        );

        error.status = 401;
        throw error;
    }

    let response;

    try {
        response = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                Accept: "application/json",
                ...options.headers,
                Authorization: `Bearer ${token}`
            }
        });
    } catch {
        throw new Error(
            "Unable to connect to the server. Please try again."
        );
    }

    return handleResponse(
        response,
        "Notification request failed."
    );
}

// GET /api/notifications
export async function getNotifications() {
    const data = await notificationRequest(
        "/api/notifications"
    );

    return Array.isArray(data) ? data : [];
}

// PATCH /api/notifications/{id}/read
export async function markNotificationAsRead(notificationId) {
    return notificationRequest(
        `/api/notifications/${notificationId}/read`,
        {
            method: "PATCH"
        }
    );
}

// POST /api/notifications/test
export async function createTestNotification() {
    return notificationRequest(
        "/api/notifications/test",
        {
            method: "POST"
        }
    );
}

function parseSseEvent(rawEvent) {
    let eventName = "message";
    const dataLines = [];

    for (const line of rawEvent.split(/\r?\n/)) {
        if (!line || line.startsWith(":")) {
            continue;
        }

        const separatorIndex = line.indexOf(":");

        if (separatorIndex === -1) {
            continue;
        }

        const field = line.slice(0, separatorIndex);

        let value = line.slice(separatorIndex + 1);

        if (value.startsWith(" ")) {
            value = value.slice(1);
        }

        if (field === "event") {
            eventName = value;
        }

        if (field === "data") {
            dataLines.push(value);
        }
    }

    return {
        eventName,
        data: dataLines.join("\n")
    };
}

// GET /api/notifications/stream
// The stream uses fetch because the native EventSource API
// cannot attach the Authorization header containing our JWT.
export async function connectNotificationStream({
    signal,
    onConnected,
    onNotification,
    onHeartbeat
}) {
    const token = getToken();

    if (!token) {
        dispatchUnauthorized();

        const error = new Error(
            "Authentication token not found."
        );

        error.status = 401;
        throw error;
    }

    let response;

    try {
        response = await fetch(
            `${API_URL}/api/notifications/stream`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "text/event-stream",
                    "Cache-Control": "no-cache"
                },
                signal
            }
        );
    } catch (error) {
        if (signal?.aborted) {
            return;
        }

        throw new Error(
            "Unable to connect to the notification stream."
        );
    }

    if (response.status === 401) {
        dispatchUnauthorized();

        throw new Error(
            "Your session has expired."
        );
    }

    if (!response.ok) {
        throw new Error(
            `Notification stream failed (${response.status}).`
        );
    }

    if (!response.body) {
        throw new Error(
            "This browser does not support response streaming."
        );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";

    try {
        while (!signal?.aborted) {
            const { value, done } = await reader.read();

            if (done) {
                break;
            }

            buffer += decoder.decode(value, {
                stream: true
            });

            const events = buffer.split(/\r?\n\r?\n/);

            buffer = events.pop() ?? "";

            for (const rawEvent of events) {
                if (!rawEvent.trim()) {
                    continue;
                }

                const event = parseSseEvent(rawEvent);

                if (event.eventName === "connected") {
                    onConnected?.();
                    continue;
                }

                if (event.eventName === "heartbeat") {
                    onHeartbeat?.();
                    continue;
                }

                if (
                    event.eventName === "notification" &&
                    event.data
                ) {
                    try {
                        const notification =
                            JSON.parse(event.data);

                        onNotification?.(notification);
                    } catch (error) {
                        console.error(
                            "Unable to parse notification:",
                            error
                        );
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    if (!signal?.aborted) {
        throw new Error(
            "The notification stream was disconnected."
        );
    }
}
