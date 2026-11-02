package com.project.expenzoback.controller;

import com.project.expenzoback.dto.notification.NotificationResponse;
import com.project.expenzoback.model.functionality.notification.NotificationType;
import com.project.expenzoback.service.functionality.notification.NotificationService;
import com.project.expenzoback.service.security.UserPrincipal;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(
            NotificationService notificationService
    ) {
        this.notificationService = notificationService;
    }

    @GetMapping(
            value = "/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE
    )
    public SseEmitter stream(
            @AuthenticationPrincipal UserPrincipal principal
    ){
        Long userId = principal.getUserId();
        return notificationService.createConnection(userId);
    }

    @PostMapping("/test")
    public NotificationResponse testNotification(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal.getUserId();

        NotificationResponse notification =
                notificationService.createNotification(
                        userId,
                        NotificationType.SYSTEM,
                        "This is a test notification!"
                );

        notificationService.sendNotification(
                userId,
                notification
        );

        return notification;
    }

    @GetMapping
    public List<NotificationResponse> getNotifications(
            @AuthenticationPrincipal UserPrincipal principal
    ) {

        Long userId = principal.getUserId();

        return notificationService.getNotifications(userId);
    }


    @PatchMapping("/{notificationId}/read")
    public NotificationResponse markAsRead(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {

        Long userId = principal.getUserId();

        return notificationService.markAsRead(
                notificationId,
                userId
        );
    }
}
