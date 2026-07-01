package com.syntaxcore.workforce.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentResponse {
    private UUID id;
    private String name;
    private String code;
    private String description;
    private boolean active;
    private UUID managerId;
    private String managerName;
    private String managerAvatar;
    private int employeeCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
