package com.syntaxcore.workforce.dto.request;

import com.syntaxcore.workforce.enums.Role;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class RegisterRequest {

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 100, message = "First name must be between 2 and 100 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 100, message = "Last name must be between 2 and 100 characters")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    // Nullable for profile-update calls; required only at registration (validated in service layer)
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=]).*$",
             message = "Password must contain at least one uppercase, lowercase, digit, and special character")
    private String password;

    private Role role;

    private UUID departmentId;

    private String phone;
    private String jobTitle;
    private LocalDate dateOfJoining;
}
