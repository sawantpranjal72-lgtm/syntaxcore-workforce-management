package com.syntaxcore.workforce.dto.response;

import com.syntaxcore.workforce.enums.Priority;
import com.syntaxcore.workforce.enums.TaskStatus;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {
    private UUID id;
    private String title;
    private String description;
    private TaskStatus status;

    /**
     * The viewing user's own personal status on this task, distinct from the
     * shared "status" field above. On a multi-assignee task, each person's
     * submission/approval is independent — one assignee's work being approved
     * (or rejected) must never make another assignee's still-unsubmitted task
     * appear "completed" or "under review" on their own task list. Populated
     * only by endpoints with a specific viewer in context (e.g. My Tasks);
     * null for project-wide/admin list views where there is no single viewer.
     */
    private String myStatus;
    /** Raw status of the viewer's own latest submission: PENDING / APPROVED / REJECTED, or null if they haven't submitted. */
    private String mySubmissionStatus;
    /** Reviewer feedback on the viewer's own latest submission, if reviewed. */
    private String myReviewFeedback;
    private Priority priority;
    private UUID projectId;
    private String projectName;
    private UUID sprintId;
    private String sprintName;
    private UUID milestoneId;
    private String milestoneName;
    private UserSummaryResponse assignee;
    private UserSummaryResponse reporter;
    private List<UserSummaryResponse> assignees;
    private UUID parentTaskId;
    private String parentTaskTitle;
    private List<TaskResponse> subtasks;
    private LocalDateTime deadline;
    private Double estimatedHours;
    private Double actualHours;
    private Integer storyPoints;
    private List<String> labels;
    private List<String> tags;
    private String checklist;
    private boolean recurring;
    private String recurrencePattern;
    private String boardColumn;
    private Integer boardOrder;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private int commentCount;
    private int attachmentCount;
    private int subtaskCount;
    private int completedSubtaskCount;
}
