package com.syntaxcore.workforce.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Admin-configurable list of email addresses that receive
 * notifications when a leave request is raised by any employee.
 */
@Entity
@Table(name = "leave_email_configs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LeaveEmailConfig extends BaseEntity {

    /** Recipient email address */
    @Column(name = "email", nullable = false, length = 255)
    private String email;

    /** Optional display name for UI */
    @Column(name = "display_name", length = 150)
    private String displayName;

    /** Whether this recipient is currently active */
    @Column(name = "is_active")
    @Builder.Default
    private boolean active = true;

    /** Leave types to notify about; null/empty = all types (comma-separated) */
    @Column(name = "leave_types", length = 500)
    private String leaveTypes;

    /** Who added this config */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "added_by_id")
    private User addedBy;
}
