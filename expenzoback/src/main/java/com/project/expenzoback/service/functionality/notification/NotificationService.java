package com.project.expenzoback.service.functionality.notification;

import com.project.expenzoback.dto.notification.NotificationResponse;
import com.project.expenzoback.model.functionality.notification.NotificationType;
import com.project.expenzoback.model.functionality.notification.Notifications;
import com.project.expenzoback.model.security.Users;
import com.project.expenzoback.repository.NotificationRepo;
import com.project.expenzoback.repository.UsersRepo;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class NotificationService {

    private final NotificationRepo notificationRepository;
    private final UsersRepo usersRepo;


    private final Map<Long, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public NotificationService(
            NotificationRepo notificationRepository,
            UsersRepo usersRepo
    ) {
        this.notificationRepository = notificationRepository;
        this.usersRepo = usersRepo;
    }

    public NotificationResponse createReminderNotification(
            Long userId,
            NotificationType type,
            String message,
            Long referenceId,
            LocalDate referenceDate
    ) {

        boolean alreadyExists =
                notificationRepository
                        .existsByUser_IdAndTypeAndReferenceIdAndReferenceDate(
                                userId,
                                type,
                                referenceId,
                                referenceDate
                        );

        if (alreadyExists) {
            return null;
        }

        Users user = usersRepo.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        Notifications notification = new Notifications();

        notification.setUser(user);
        notification.setType(type);
        notification.setMessage(message);
        notification.setReferenceId(referenceId);
        notification.setReferenceDate(referenceDate);

        Notifications savedNotification =
                notificationRepository.save(notification);

        return new NotificationResponse(savedNotification);
    }

    public NotificationResponse createNotification(
            Long userId,
            NotificationType type,
            String message
    ) {

        Users user = usersRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Notifications notification = new Notifications();

        notification.setUser(user);
        notification.setType(type);
        notification.setMessage(message);

        Notifications savedNotification =
                notificationRepository.save(notification);

        return new NotificationResponse(savedNotification);
    }

    public SseEmitter createConnection(Long userId) {

        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);

        emitters
                .computeIfAbsent(
                        userId,
                        key -> new CopyOnWriteArrayList<>()
                )
                .add(emitter);

        Runnable removeEmitter = () ->
                removeEmitter(userId, emitter);

        emitter.onCompletion(removeEmitter);
        emitter.onTimeout(removeEmitter);
        emitter.onError(exception -> removeEmitter.run());

        try {

            emitter.send(
                    SseEmitter.event()
                            .name("connected")
                            .data("Notification stream connected")
            );

        } catch (IOException e) {

            removeEmitter(userId, emitter);
        }

        return emitter;
    }

    public void sendNotification(
            Long userId,
            NotificationResponse notification
    ) {

        List<SseEmitter> userEmitters = emitters.get(userId);

        if (userEmitters == null) {
            return;
        }

        for (SseEmitter emitter : userEmitters) {

            try {

                emitter.send(
                        SseEmitter.event()
                                .name("notification")
                                .data(notification)
                );

            } catch (IOException e) {

                removeEmitter(userId, emitter);
            }
        }
    }

    public List<NotificationResponse> getNotifications(Long userId) {

        return notificationRepository
                .findAllByUser_IdOrderByCreatedAtDesc(userId)
                .stream()
                .map(NotificationResponse::new)
                .toList();
    }

    public NotificationResponse markAsRead(
            Long notificationId,
            Long userId
    ) {

        Notifications notification =
                notificationRepository
                        .findByIdAndUser_Id(notificationId, userId)
                        .orElseThrow(() ->
                                new RuntimeException("Notification not found"));

        notification.setRead(true);

        Notifications savedNotification =
                notificationRepository.save(notification);

        return new NotificationResponse(savedNotification);
    }

    private void removeEmitter(
            Long userId,
            SseEmitter emitter
    ) {

        List<SseEmitter> userEmitters = emitters.get(userId);

        if (userEmitters == null) {
            return;
        }

        userEmitters.remove(emitter);

        if (userEmitters.isEmpty()) {
            emitters.remove(userId);
        }
    }

    @Scheduled(fixedRate = 30_000)
    public void sendHeartbeat() {

        for (Map.Entry<Long, List<SseEmitter>> entry : emitters.entrySet()) {

            Long userId = entry.getKey();

            for (SseEmitter emitter : entry.getValue()) {

                try {

                    emitter.send(
                            SseEmitter.event()
                                    .name("heartbeat")
                                    .data("ping")
                    );

                } catch (IOException e) {

                    removeEmitter(userId, emitter);
                }
            }
        }
    }
}
