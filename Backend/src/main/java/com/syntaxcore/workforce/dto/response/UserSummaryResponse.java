package com.syntaxcore.workforce.dto.response;

import com.syntaxcore.workforce.enums.Role;
import lombok.*;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryResponse {
    private UUID id;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String employeeId;
    private Role role;
    private String jobTitle;
    private String avatarUrl;
    private String departmentName;
    private UUID departmentId;
    private boolean active;
    private boolean emailVerified;
    private LocalDate dateOfJoining;
}
