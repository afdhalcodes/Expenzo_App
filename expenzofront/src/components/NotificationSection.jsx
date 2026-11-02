
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

import {
    connectNotificationStream,
    createTestNotification,
    getNotifications,
    markNotificationAsRead
} from "../services/notificationService";

import "./NotificationSection.css";

const RECONNECT_DELAY = 3000;
const TOAST_DURATION = 6000;

function sortNotifications(items) {
    return [...items].sort(
        (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
    );
}

function mergeNotifications(current, incoming) {
    const notificationMap = new Map(
        current.map((item) => [String(item.id), item])
    );

    for (const item of incoming) {
        const key = String(item.id);
        const previous = notificationMap.get(key);

        // Do not let an older SSE payload undo a read status.
        notificationMap.set(key, {
            ...previous,
            ...item,
            read: previous?.read === true
                ? true
                : Boolean(item.read)
        });
    }

    return sortNotifications(
        Array.from(notificationMap.values())
    );
}

function formatNotificationDate(createdAt) {
    if (!createdAt) {
        return "Just now";
    }

    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
        return "Just now";
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getNotificationTitle(type) {
    switch (type) {
        case "LOAN_REMINDER":
            return "Loan reminder";

        case "RECURRING_PAYMENT_REMINDER":
            return "Recurring payment reminder";

        case "DEBT_REMINDER":
            return "Debt reminder";

        case "PAYMENT_DUE":
            return "Payment due";

        case "SYSTEM":
            return "System notification";

        default:
            return "Notification";
    }
}

function getNotificationIcon(type) {
    switch (type) {
        case "LOAN_REMINDER":
            return "₹";

        case "RECURRING_PAYMENT_REMINDER":
            return "↻";

        case "DEBT_REMINDER":
            return "↗";

        case "PAYMENT_DUE":
            return "!";

        case "SYSTEM":
            return "i";

        default:
            return "•";
    }
}

function NotificationSection() {
    const [notifications, setNotifications] = useState([]);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [connectionStatus, setConnectionStatus] =
        useState("connecting");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [toasts, setToasts] = useState([]);
    const [testing, setTesting] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);

    const mountedRef = useRef(false);
    const abortControllerRef = useRef(null);
    const toastTimersRef = useRef(new Map());
    const seenNotificationIdsRef = useRef(new Set());

    const unreadCount = useMemo(
        () => notifications.filter(
            (notification) => !notification.read
        ).length,
        [notifications]
    );

    const removeToast = useCallback((toastId) => {
        const timer = toastTimersRef.current.get(toastId);

        if (timer) {
            window.clearTimeout(timer);
            toastTimersRef.current.delete(toastId);
        }

        setToasts((current) =>
            current.filter((toast) => toast.toastId !== toastId)
        );
    }, []);

    const showToast = useCallback((notification) => {
        const toastId = `${notification.id}-${Date.now()}`;

        setToasts((current) => [
            ...current,
            { toastId, notification }
        ]);

        const timer = window.setTimeout(() => {
            toastTimersRef.current.delete(toastId);

            if (mountedRef.current) {
                setToasts((current) =>
                    current.filter(
                        (toast) => toast.toastId !== toastId
                    )
                );
            }
        }, TOAST_DURATION);

        toastTimersRef.current.set(toastId, timer);
    }, []);

    const loadNotifications = useCallback(async () => {
        try {
            const data = await getNotifications();

            if (!mountedRef.current) {
                return;
            }

            const items = sortNotifications(data);

            // Initial loading should not create a toast for
            // every notification that already exists in the DB.
            for (const item of items) {
                seenNotificationIdsRef.current.add(
                    String(item.id)
                );
            }

            setNotifications(items);
            setError("");
        } catch (loadError) {
            if (mountedRef.current) {
                setError(loadError.message);
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, []);

    const handleIncomingNotification = useCallback(
        (notification) => {
            if (!mountedRef.current || !notification?.id) {
                return;
            }

            const id = String(notification.id);
            const isNew = !seenNotificationIdsRef.current.has(id);

            seenNotificationIdsRef.current.add(id);

            setNotifications((current) =>
                mergeNotifications(current, [notification])
            );

            // The same notification may arrive over SSE and
            // through the test endpoint. Avoid duplicate toasts.
            if (isNew && !notification.read) {
                showToast(notification);
            }
        },
        [showToast]
    );

    useEffect(() => {
        mountedRef.current = true;

        let stopped = false;
        let reconnectTimer = null;
        let activeController = null;

        const isActive = () =>
            mountedRef.current && !stopped;

        const waitBeforeReconnect = () =>
            new Promise((resolve) => {
                reconnectTimer = window.setTimeout(
                    resolve,
                    RECONNECT_DELAY
                );
            });

        const runStream = async () => {
            while (isActive()) {
                if (!navigator.onLine) {
                    setConnectionStatus("offline");
                    await waitBeforeReconnect();
                    continue;
                }

                const controller = new AbortController();

                activeController = controller;
                abortControllerRef.current = controller;

                setConnectionStatus("connecting");

                try {
                    await connectNotificationStream({
                        signal: controller.signal,

                        onConnected: async () => {
                            if (!isActive()) {
                                return;
                            }

                            setConnectionStatus("connected");

                            // Recover notifications missed while offline.
                            await loadNotifications();
                        },

                        onNotification: handleIncomingNotification
                    });

                    if (isActive() && !controller.signal.aborted) {
                        throw new Error(
                            "Notification stream disconnected."
                        );
                    }
                } catch (streamError) {
                    if (!isActive()) {
                        break;
                    }

                    // The global unauthorized handler in App.jsx
                    // redirects the user to the login page.
                    if (streamError.status === 401) {
                        break;
                    }

                    setConnectionStatus(
                        navigator.onLine
                            ? "disconnected"
                            : "offline"
                    );
                } finally {
                    if (activeController === controller) {
                        activeController = null;
                        abortControllerRef.current = null;
                    }
                }

                if (isActive()) {
                    await waitBeforeReconnect();
                }
            }
        };

        const handleOnline = () => {
            if (reconnectTimer !== null) {
                window.clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }

            activeController?.abort();
        };

        const handleOffline = () => {
            setConnectionStatus("offline");
            activeController?.abort();
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Fetch history first; then establish the live stream.
        const start = async () => {
            await loadNotifications();

            if (isActive()) {
                await runStream();
            }
        };

        start();

        return () => {
            stopped = true;
            mountedRef.current = false;

            activeController?.abort();
            abortControllerRef.current?.abort();

            if (reconnectTimer !== null) {
                window.clearTimeout(reconnectTimer);
            }

            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);

            for (const timer of toastTimersRef.current.values()) {
                window.clearTimeout(timer);
            }

            toastTimersRef.current.clear();
        };
    }, [handleIncomingNotification, loadNotifications]);

    const handleMarkAsRead = async (notificationId) => {
        setError("");

        try {
            const updated = await markNotificationAsRead(
                notificationId
            );

            setNotifications((current) =>
                current.map((item) =>
                    String(item.id) === String(updated.id)
                        ? { ...item, ...updated, read: true }
                        : item
                )
            );
        } catch (markError) {
            setError(markError.message);
        }
    };

    const handleMarkAllAsRead = async () => {
        const unread = notifications.filter(
            (notification) => !notification.read
        );

        if (unread.length === 0 || markingAll) {
            return;
        }

        setMarkingAll(true);
        setError("");

        try {
            // The backend currently exposes a PATCH endpoint
            // for one notification at a time.
            const results = await Promise.all(
                unread.map((notification) =>
                    markNotificationAsRead(notification.id)
                )
            );

            const updatedById = new Map(
                results.map((item) => [
                    String(item.id),
                    item
                ])
            );

            setNotifications((current) =>
                current.map((item) => {
                    const updated = updatedById.get(
                        String(item.id)
                    );

                    return updated
                        ? { ...item, ...updated, read: true }
                        : item;
                })
            );
        } catch (markError) {
            setError(markError.message);

            // Some PATCH requests may already have succeeded.
            // Reload to keep the UI consistent with the database.
            await loadNotifications();
        } finally {
            setMarkingAll(false);
        }
    };

    const handleTestNotification = async () => {
        if (testing) {
            return;
        }

        setTesting(true);
        setError("");

        try {
            const notification = await createTestNotification();

            // SSE normally delivers the same notification. Add it
            // here only if the stream hasn't delivered it already.
            const id = String(notification.id);

            if (!seenNotificationIdsRef.current.has(id)) {
                handleIncomingNotification(notification);
            }
        } catch (testError) {
            setError(testError.message);
        } finally {
            setTesting(false);
        }
    };

    const statusText = {
        connected: "Live",
        connecting: "Connecting...",
        disconnected: "Reconnecting...",
        offline: "Offline"
    }[connectionStatus];

    return (
        <div className="notification-container">
            <button
                className="notification-button"
                type="button"
                aria-label={`Notifications, ${unreadCount} unread`}
                aria-expanded={isPanelOpen}
                onClick={() =>
                    setIsPanelOpen((current) => !current)
                }
            >
                <span className="notification-bell">♢</span>

                {unreadCount > 0 && (
                    <span className="notification-badge">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {isPanelOpen && (
                <>
                    <button
                        type="button"
                        className="notification-panel-backdrop"
                        aria-label="Close notifications"
                        onClick={() => setIsPanelOpen(false)}
                    />

                    <section
                        className="notification-panel"
                        aria-label="Notifications"
                    >
                        <div className="notification-panel-header">
                            <div>
                                <h2>Notifications</h2>

                                <div className="notification-connection-status">
                                    <span
                                        className={`connection-dot ${connectionStatus}`}
                                    />
                                    {statusText}
                                </div>
                            </div>

                            <div className="notification-header-actions">
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        className="notification-text-button"
                                        onClick={handleMarkAllAsRead}
                                        disabled={markingAll}
                                    >
                                        {markingAll
                                            ? "Marking..."
                                            : "Mark all read"}
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="notification-close-button"
                                    aria-label="Close notifications"
                                    onClick={() => setIsPanelOpen(false)}
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div
                                className="notification-error"
                                role="alert"
                            >
                                {error}
                            </div>
                        )}

                        <div className="notification-test-row">
                            <button
                                type="button"
                                className="notification-test-button"
                                onClick={handleTestNotification}
                                disabled={testing}
                            >
                                {testing
                                    ? "Sending..."
                                    : "Test notification"}
                            </button>
                        </div>

                        <div className="notification-list">
                            {loading && (
                                <div className="notification-empty">
                                    Loading notifications...
                                </div>
                            )}

                            {!loading && notifications.length === 0 && (
                                <div className="notification-empty">
                                    <div className="notification-empty-icon">
                                        ✓
                                    </div>

                                    <strong>No notifications</strong>

                                    <span>
                                        Reminders and system messages
                                        will appear here.
                                    </span>
                                </div>
                            )}

                            {!loading && notifications.map((notification) => (
                                <article
                                    className={`notification-item ${
                                        notification.read
                                            ? "read"
                                            : "unread"
                                    }`}
                                    key={notification.id}
                                >
                                    <div
                                        className={`notification-type-icon notification-type-${String(
                                            notification.type || "SYSTEM"
                                        ).toLowerCase()}`}
                                    >
                                        {getNotificationIcon(
                                            notification.type
                                        )}
                                    </div>

                                    <div className="notification-item-content">
                                        <div className="notification-item-top">
                                            <strong>
                                                {getNotificationTitle(
                                                    notification.type
                                                )}
                                            </strong>

                                            {!notification.read && (
                                                <span className="notification-unread-dot" />
                                            )}
                                        </div>

                                        <p>{notification.message}</p>

                                        <div className="notification-item-bottom">
                                            <span>
                                                {formatNotificationDate(
                                                    notification.createdAt
                                                )}
                                            </span>

                                            {!notification.read && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleMarkAsRead(
                                                            notification.id
                                                        )
                                                    }
                                                >
                                                    Mark as read
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                </>
            )}

            <div
                className="notification-toast-container"
                aria-live="polite"
                aria-atomic="false"
            >
                {toasts.map(({ toastId, notification }) => (
                    <div
                        className="notification-toast"
                        key={toastId}
                    >
                        <div className="notification-toast-icon">
                            {getNotificationIcon(notification.type)}
                        </div>

                        <div className="notification-toast-content">
                            <strong>
                                {getNotificationTitle(notification.type)}
                            </strong>

                            <p>{notification.message}</p>
                        </div>

                        <button
                            type="button"
                            className="notification-toast-close"
                            aria-label="Dismiss notification"
                            onClick={() => removeToast(toastId)}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default NotificationSection;
