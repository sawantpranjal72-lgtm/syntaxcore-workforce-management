package com.syntaxcore.workforce.entity;

import com.syntaxcore.workforce.enums.Role;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "role_menu_access",
    uniqueConstraints = @UniqueConstraint(name = "uk_role_menu_access_role_menu", columnNames = {"role", "menu_key"}),
    indexes = @Index(name = "idx_role_menu_access_role", columnList = "role")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleMenuAccess extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 50)
    private Role role;

    @Column(name = "menu_key", nullable = false, length = 100)
    private String menuKey;

    @Builder.Default
    @Column(name = "is_allowed", nullable = false)
    private boolean allowed = true;
}
