package com.syntaxcore.workforce.dto.response;

import com.syntaxcore.workforce.enums.NotificationType;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private UUID id;
    private NotificationType type;
    private String title;
    private String message;
    private String entityType;
    private UUID entityId;
    private String actionUrl;
    private boolean read;
    private UserSummaryResponse sender;
    private LocalDateTime createdAt;
}
