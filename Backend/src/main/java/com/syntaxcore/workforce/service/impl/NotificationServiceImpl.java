package com.syntaxcore.workforce.service.impl;

import com.syntaxcore.workforce.dto.response.NotificationResponse;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import com.syntaxcore.workforce.dto.response.UserSummaryResponse;
import com.syntaxcore.workforce.entity.Notification;
import com.syntaxcore.workforce.entity.User;
import com.syntaxcore.workforce.enums.NotificationType;
import com.syntaxcore.workforce.exception.ResourceNotFoundException;
import com.syntaxcore.workforce.repository.NotificationRepository;
import com.syntaxcore.workforce.repository.UserRepository;
import com.syntaxcore.workforce.service.NotificationService;
import com.syntaxcore.workforce.util.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserMapper userMapper;

    @Override
    public void sendNotification(User recipient, User sender, NotificationType type,
                                  String title, String message, String entityType, UUID entityId) {
        // Auto-generate actionUrl for deep-link routing
        String actionUrl = null;
        if (entityType != null && entityId != null) {
            actionUrl = switch (entityType.toUpperCase()) {
                case "TASK"    -> "/tasks/" + entityId;
                case "PROJECT" -> "/projects/" + entityId;
                case "LEAVE"   -> "/leaves";
                case "CHAT"    -> "/chat";
                default        -> null;
            };
        } else if (type != null && type.name().startsWith("LEAVE")) {
            actionUrl = "/leaves";
        } else if (type != null && type.name().startsWith("TASK")) {
            actionUrl = entityId != null ? "/tasks/" + entityId : "/tasks";
        }

        Notification notification = Notification.builder()
            .recipient(recipient)
            .sender(sender)
            .type(type)
            .title(title)
            .message(message)
            .entityType(entityType)
            .entityId(entityId)
            .actionUrl(actionUrl)
            .read(false)
            .build();

        Notification saved = notificationRepository.save(notification);

        // Push real-time notification via WebSocket
        // Use both email (Spring Security principal) and userId for maximum client compatibility
        NotificationResponse response = toResponse(saved);
        messagingTemplate.convertAndSendToUser(
            recipient.getEmail(),
            "/queue/notifications",
            response
        );
        messagingTemplate.convertAndSendToUser(
            recipient.getId().toString(),
            "/queue/notifications",
            response
        );

        log.debug("Notification sent to {} [{}] via WebSocket: {}", recipient.getEmail(), recipient.getId(), title);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<NotificationResponse> getMyNotifications(String userEmail, Pageable pageable) {
        User user = findUserByEmail(userEmail);
        Page<Notification> page = notificationRepository
            .findByRecipientIdAndDeletedFalseOrderByCreatedAtDesc(user.getId(), pageable);
        Page<NotificationResponse> responsePage = page.map(this::toResponse);
        return PagedResponse.from(responsePage);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(String userEmail) {
        User user = findUserByEmail(userEmail);
        return notificationRepository.countByRecipientIdAndReadFalseAndDeletedFalse(user.getId());
    }

    @Override
    public void markAsRead(UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new ResourceNotFoundException("Notification", notificationId.toString()));
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Override
    public void markAllAsRead(String userEmail) {
        User user = findUserByEmail(userEmail);
        notificationRepository.markAllAsReadForUser(user.getId());
    }

    private NotificationResponse toResponse(Notification n) {
        UserSummaryResponse senderSummary = n.getSender() != null ? userMapper.toSummaryResponse(n.getSender()) : null;
        return NotificationResponse.builder()
            .id(n.getId())
            .type(n.getType())
            .title(n.getTitle())
            .message(n.getMessage())
            .entityType(n.getEntityType())
            .entityId(n.getEntityId())
            .actionUrl(n.getActionUrl())
            .read(n.isRead())
            .sender(senderSummary)
            .createdAt(n.getCreatedAt())
            .build();
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmailIgnoreCaseAndDeletedFalse(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", email));
    }
}
