package com.syntaxcore.workforce.dto.request;

import com.syntaxcore.workforce.enums.Priority;
import com.syntaxcore.workforce.enums.ProjectStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class ProjectRequest {
    @NotBlank(message = "Project name is required")
    @Size(max = 200)
    private String name;

    private String code;
    private String description;
    private ProjectStatus status;
    private Priority priority;
    private UUID managerId;
    private List<UUID> memberIds;
    private LocalDate startDate;
    private LocalDate endDate;
    private Double budget;
    private String techStack;
    private String repositoryUrl;
    private String avatarColor;
}
