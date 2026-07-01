package com.syntaxcore.workforce.dto.response;

import com.syntaxcore.workforce.enums.Role;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDetailResponse {
    private UUID id;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String employeeId;
    private Role role;
    private String jobTitle;
    private String phone;
    private String avatarUrl;
    private String bio;
    private String skills;
    private String githubUrl;
    private String linkedinUrl;
    private String address;
    private UUID departmentId;
    private String departmentName;
    private boolean active;
    private boolean emailVerified;
    private LocalDate dateOfJoining;
    private LocalDate dateOfBirth;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
    // Stats
    private Long totalTasksAssigned;
    private Long completedTasks;
    private Long pendingTasks;
}
