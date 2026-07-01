package com.syntaxcore.workforce.entity;

import com.syntaxcore.workforce.enums.Priority;
import com.syntaxcore.workforce.enums.ProjectStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "projects", indexes = {
    @Index(name = "idx_projects_status", columnList = "status"),
    @Index(name = "idx_projects_manager", columnList = "manager_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project extends BaseEntity {

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "code", unique = true, length = 20)
    private String code;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "status", nullable = false)
    private ProjectStatus status = ProjectStatus.PLANNING;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "priority", nullable = false)
    private Priority priority = Priority.MEDIUM;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id", nullable = false)
    private User manager;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "project_members",
        joinColumns = @JoinColumn(name = "project_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Builder.Default
    private Set<User> members = new HashSet<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Task> tasks = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Sprint> sprints = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Milestone> milestones = new ArrayList<>();

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "budget")
    private Double budget;

    @Column(name = "tech_stack", columnDefinition = "TEXT")
    private String techStack;

    @Column(name = "repository_url")
    private String repositoryUrl;

    @Column(name = "avatar_color", length = 10)
    private String avatarColor;
}
