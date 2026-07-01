package com.syntaxcore.workforce.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityLogResponse {
    private UUID id;
    private String action;
    private String entityType;
    private UUID entityId;
    private String description;
    private String oldValue;
    private String newValue;
    private UserSummaryResponse user;
    private LocalDateTime createdAt;
}
