package com.syntaxcore.workforce.entity;

import com.syntaxcore.workforce.enums.Role;
import jakarta.persistence.*;
import lombok.*;

/**
 * Super-Admin-configurable, per-role exam permissions.
 * canManage  -> may create, edit, delete, and publish exams
 * canTake    -> may attempt/solve exams
 * SUPER_ADMIN is always treated as canManage = true in application
 * logic regardless of the stored row (defense against accidental lockout).
 */
@Entity
@Table(
    name = "exam_role_permissions",
    uniqueConstraints = @UniqueConstraint(name = "uk_exam_role_permissions_role", columnNames = "role")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamRolePermission extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 50)
    private Role role;

    @Column(name = "can_manage", nullable = false)
    @Builder.Default
    private boolean canManage = false;

    @Column(name = "can_take", nullable = false)
    @Builder.Default
    private boolean canTake = true;
}
