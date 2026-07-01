package com.syntaxcore.workforce.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sprints")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sprint extends BaseEntity {

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "goal", columnDefinition = "TEXT")
    private String goal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "is_active")
    @Builder.Default
    private boolean active = false;

    @Column(name = "is_completed")
    @Builder.Default
    private boolean completed = false;

    @Column(name = "velocity")
    private Integer velocity;

    @OneToMany(mappedBy = "sprint", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Task> tasks = new ArrayList<>();
}
