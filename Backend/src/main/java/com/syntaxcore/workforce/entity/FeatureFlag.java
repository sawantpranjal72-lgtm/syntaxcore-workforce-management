package com.syntaxcore.workforce.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "feature_flags",
    uniqueConstraints = @UniqueConstraint(name = "uk_feature_flags_key", columnNames = "flag_key")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeatureFlag extends BaseEntity {

    @Column(name = "flag_key", nullable = false, length = 100)
    private String key;

    @Builder.Default
    @Column(name = "is_enabled", nullable = false)
    private boolean enabled = true;
}
