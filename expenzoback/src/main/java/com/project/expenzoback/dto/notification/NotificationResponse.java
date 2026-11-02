package com.project.expenzoback.dto.notification;

import com.project.expenzoback.model.functionality.notification.NotificationType;
import com.project.expenzoback.model.functionality.notification.Notifications;

import java.time.LocalDateTime;

public class NotificationResponse {

    private Long id;

    private NotificationType type;

    private String message;

    private boolean read;

    private LocalDateTime createdAt;

    public NotificationResponse(Notifications notification) {
        this.id = notification.getId();
        this.type = notification.getType();
        this.message = notification.getMessage();
        this.read = notification.isRead();
        this.createdAt = notification.getCreatedAt();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public NotificationType getType() {
        return type;
    }

    public void setType(NotificationType type) {
        this.type = type;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
