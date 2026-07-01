package com.syntaxcore.workforce.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "milestones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Milestone extends BaseEntity {

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "is_completed")
    @Builder.Default
    private boolean completed = false;

    @Column(name = "completion_percentage")
    @Builder.Default
    private Integer completionPercentage = 0;
}
