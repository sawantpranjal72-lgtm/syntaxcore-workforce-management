package com.syntaxcore.workforce.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSessionResponse {
    private UUID id;
    private UUID userId;
    private String userName;
    private String ipAddress;
    private String userAgent;
    private String deviceType;
    private String location;
    private boolean active;
    private LocalDateTime lastActivity;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
}
