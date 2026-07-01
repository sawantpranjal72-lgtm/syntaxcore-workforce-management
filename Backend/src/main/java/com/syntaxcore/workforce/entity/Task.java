package com.syntaxcore.workforce.entity;

import com.syntaxcore.workforce.enums.Priority;
import com.syntaxcore.workforce.enums.TaskStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "tasks", indexes = {
    @Index(name = "idx_tasks_status", columnList = "status"),
    @Index(name = "idx_tasks_project", columnList = "project_id"),
    @Index(name = "idx_tasks_assignee", columnList = "assignee_id"),
    @Index(name = "idx_tasks_deadline", columnList = "deadline")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Task extends BaseEntity {

    @Column(name = "title", nullable = false, length = 300)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "status", nullable = false)
    private TaskStatus status = TaskStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "priority", nullable = false)
    private Priority priority = Priority.MEDIUM;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sprint_id")
    private Sprint sprint;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id")
    private Milestone milestone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id")
    private User reporter;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "task_assignees",
        joinColumns = @JoinColumn(name = "task_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Builder.Default
    private Set<User> assignees = new HashSet<>();

    /**
     * Assignees who have clicked "Start Working" on their own portion of this
     * task. On a multi-assignee task there was previously no per-person
     * record of this at all — only the shared Task.status existed, so one
     * person starting work (or a submission/review happening) silently
     * affected everyone else's displayed status too. This collection lets
     * each assignee's individual progress move from PENDING to IN_PROGRESS
     * independently of the others.
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "task_started_by",
        joinColumns = @JoinColumn(name = "task_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Builder.Default
    private Set<User> startedBy = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_task_id")
    private Task parentTask;

    @OneToMany(mappedBy = "parentTask", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Task> subtasks = new ArrayList<>();

    @Column(name = "deadline")
    private LocalDateTime deadline;

    @Column(name = "estimated_hours")
    private Double estimatedHours;

    @Column(name = "actual_hours")
    private Double actualHours;

    @Column(name = "story_points")
    private Integer storyPoints;

    @Column(name = "labels", columnDefinition = "TEXT")
    private String labels;

    @Column(name = "tags", columnDefinition = "TEXT")
    private String tags;

    @Column(name = "checklist", columnDefinition = "TEXT")
    private String checklist;

    @Column(name = "is_recurring")
    @Builder.Default
    private boolean recurring = false;

    @Column(name = "recurrence_pattern")
    private String recurrencePattern;

    @Column(name = "board_column")
    private String boardColumn;

    @Column(name = "board_order")
    private Integer boardOrder;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TaskComment> comments = new ArrayList<>();

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TaskAttachment> attachments = new ArrayList<>();

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TaskSubmission> submissions = new ArrayList<>();

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ActivityLog> activityLogs = new ArrayList<>();
}
