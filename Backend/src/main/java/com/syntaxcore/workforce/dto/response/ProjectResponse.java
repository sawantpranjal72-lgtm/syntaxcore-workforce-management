package com.syntaxcore.workforce.dto.response;

import com.syntaxcore.workforce.enums.Priority;
import com.syntaxcore.workforce.enums.ProjectStatus;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponse {
    private UUID id;
    private String name;
    private String code;
    private String description;
    private ProjectStatus status;
    private Priority priority;
    private UserSummaryResponse manager;
    private List<UserSummaryResponse> members;
    private LocalDate startDate;
    private LocalDate endDate;
    private Double budget;
    private String techStack;
    private String repositoryUrl;
    private String avatarColor;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    // Stats
    private int totalTasks;
    private int completedTasks;
    private int pendingTasks;
    private int totalSprints;
    private int activeSprints;
    private int totalMilestones;
    private int completedMilestones;
    private double completionPercentage;
}
