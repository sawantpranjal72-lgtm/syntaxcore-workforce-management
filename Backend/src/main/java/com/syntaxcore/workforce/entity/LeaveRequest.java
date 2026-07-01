package com.syntaxcore.workforce.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "leave_requests", indexes = {
    @Index(name = "idx_leave_user", columnList = "user_id"),
    @Index(name = "idx_leave_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaveRequest extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "leave_type", nullable = false)
    private String leaveType; // SICK, CASUAL, ANNUAL, MATERNITY, PATERNITY, UNPAID

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "total_days", nullable = false)
    private int totalDays;

    @Column(name = "reason", columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Column(name = "status", nullable = false)
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED, CANCELLED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private User reviewedBy;

    @Column(name = "review_comment", columnDefinition = "TEXT")
    private String reviewComment;

    @Column(name = "is_half_day")
    private boolean halfDay = false;

    /** Single-use token embedded in the notification email's approve/reject
     * links. Cleared immediately after first use or when the leave is decided
     * through the web app. Expires after 7 days so stale email links fail
     * safely rather than silently succeeding. */
    @Column(name = "email_action_token", length = 128, unique = true)
    private String emailActionToken;

    @Column(name = "email_action_expires_at")
    private java.time.LocalDateTime emailActionExpiresAt;
}
