package com.project.expenzoback.repository;

import com.project.expenzoback.model.functionality.notification.NotificationType;
import com.project.expenzoback.model.functionality.notification.Notifications;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepo extends JpaRepository<Notifications,Long> {

    List<Notifications> findAllByUser_IdOrderByCreatedAtDesc(Long userId);

    List<Notifications> findAllByUser_IdAndReadFalseOrderByCreatedAtDesc(Long userId);

    Optional<Notifications> findByIdAndUser_Id(Long notificationId, Long userId);

    boolean existsByUser_IdAndTypeAndReferenceIdAndReferenceDate(
            Long userId,
            NotificationType type,
            Long referenceId,
            LocalDate referenceDate
    );
}
