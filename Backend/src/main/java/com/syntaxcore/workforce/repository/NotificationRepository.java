package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Page<Notification> findByRecipientIdAndDeletedFalseOrderByCreatedAtDesc(UUID recipientId, Pageable pageable);

    List<Notification> findByRecipientIdAndReadFalseAndDeletedFalse(UUID recipientId);

    long countByRecipientIdAndReadFalseAndDeletedFalse(UUID recipientId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Notification n SET n.read = true WHERE n.recipient.id = :userId AND n.read = false")
    void markAllAsReadForUser(@Param("userId") UUID userId);
}
