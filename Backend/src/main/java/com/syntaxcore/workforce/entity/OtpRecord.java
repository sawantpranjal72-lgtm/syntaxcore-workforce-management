package com.syntaxcore.workforce.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "otp_records", indexes = {
    @Index(name = "idx_otp_phone", columnList = "phone"),
    @Index(name = "idx_otp_token", columnList = "token")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OtpRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "phone", nullable = true, length = 255)  // may store email as key when user has no phone
    private String phone;

    @Column(name = "email")
    private String email;

    @Column(name = "otp_code", nullable = false, length = 10)
    private String otpCode;

    @Column(name = "token", unique = true, length = 100)
    private String token; // temporary token issued after OTP verified

    @Column(name = "purpose", nullable = false, length = 50)
    private String purpose; // FORGOT_PASSWORD, PHONE_VERIFY, LOGIN_2FA

    @Column(name = "is_verified")
    @Builder.Default
    private boolean verified = false;

    @Column(name = "is_used")
    @Builder.Default
    private boolean used = false;

    @Column(name = "attempts")
    @Builder.Default
    private int attempts = 0;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() { this.createdAt = LocalDateTime.now(); }
}
