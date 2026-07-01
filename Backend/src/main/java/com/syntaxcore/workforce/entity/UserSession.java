package com.syntaxcore.workforce.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_sessions", indexes = {
    @Index(name = "idx_session_user", columnList = "user_id"),
    @Index(name = "idx_session_token", columnList = "session_token")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "session_token", unique = true, nullable = false)
    private String sessionToken;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "device_type")
    private String deviceType; // WEB, MOBILE, TABLET

    @Column(name = "location")
    private String location;

    @Column(name = "is_active")
    private boolean active = true;

    @Column(name = "last_activity")
    private LocalDateTime lastActivity;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @PrePersist
    void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.lastActivity = LocalDateTime.now();
    }
}
