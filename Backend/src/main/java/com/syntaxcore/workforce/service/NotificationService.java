package com.syntaxcore.workforce.service;

import com.syntaxcore.workforce.dto.response.NotificationResponse;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import com.syntaxcore.workforce.entity.User;
import com.syntaxcore.workforce.enums.NotificationType;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface NotificationService {
    void sendNotification(User recipient, User sender, NotificationType type,
                          String title, String message, String entityType, UUID entityId);
    PagedResponse<NotificationResponse> getMyNotifications(String userEmail, Pageable pageable);
    long getUnreadCount(String userEmail);
    void markAsRead(UUID notificationId);
    void markAllAsRead(String userEmail);
}
