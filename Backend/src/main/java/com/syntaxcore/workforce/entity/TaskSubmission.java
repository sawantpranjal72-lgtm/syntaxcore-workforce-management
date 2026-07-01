package com.syntaxcore.workforce.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "task_submissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskSubmission extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by_id", nullable = false)
    private User submittedBy;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "github_link")
    private String githubLink;

    @Column(name = "live_demo_link")
    private String liveDemoLink;

    @Column(name = "submission_file_url")
    private String submissionFileUrl;

    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED, RESUBMITTED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private User reviewedBy;

    @Column(name = "review_feedback", columnDefinition = "TEXT")
    private String reviewFeedback;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "submission_count")
    @Builder.Default
    private Integer submissionCount = 1;
}
