package com.syntaxcore.workforce.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    /**
     * When true, existing active sessions are revoked and a new session is created.
     * When false (default), if active sessions exist, login returns hasActiveSession=true
     * prompting the user to choose.
     */
    private boolean forceNewSession = false;

    /** When true, join/continue the existing session without revoking it */
    private boolean continueExistingSession = false;
}
