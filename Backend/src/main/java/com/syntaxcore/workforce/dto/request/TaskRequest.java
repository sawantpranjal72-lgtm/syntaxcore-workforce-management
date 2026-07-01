package com.syntaxcore.workforce.dto.request;

import com.syntaxcore.workforce.enums.Priority;
import com.syntaxcore.workforce.enums.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class TaskRequest {
    @NotBlank(message = "Task title is required")
    @Size(max = 300, message = "Title must not exceed 300 characters")
    private String title;

    private String description;
    private TaskStatus status;
    private Priority priority;
    private UUID projectId;
    private UUID sprintId;
    private UUID milestoneId;
    private UUID assigneeId;
    private List<UUID> assigneeIds;
    private UUID parentTaskId;
    private LocalDateTime deadline;
    private Double estimatedHours;
    private Integer storyPoints;
    private List<String> labels;
    private List<String> tags;
    private String checklist;
    private boolean recurring;
    private String recurrencePattern;
    private String boardColumn;
    private Integer boardOrder;
}
