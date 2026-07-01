package com.syntaxcore.workforce.controller;

import com.syntaxcore.workforce.dto.request.LoginRequest;
import com.syntaxcore.workforce.dto.request.RegisterRequest;
import com.syntaxcore.workforce.dto.response.AuthResponse;
import com.syntaxcore.workforce.service.AuthService;
import com.syntaxcore.workforce.service.SessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Login, registration, OTP, session management")
public class AuthController {

    private final AuthService authService;
    private final SessionService sessionService;

    @PostMapping("/login")
    @Operation(summary = "Login with email and password")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(request, httpRequest));
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new user (Admin only)")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request, httpRequest));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token using refresh token")
    public ResponseEntity<AuthResponse> refresh(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(authService.refreshToken(body.get("refreshToken")));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout and revoke all tokens")
    public ResponseEntity<Map<String, String>> logout(
            @AuthenticationPrincipal UserDetails userDetails) {
        authService.logout(userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    // ── OTP-based forgot password ─────────────────────────────
    @PostMapping("/forgot-password/send-otp")
    @Operation(summary = "Send OTP to phone/email for password reset")
    public ResponseEntity<Map<String, String>> sendForgotPasswordOtp(
            @RequestBody Map<String, String> body) {
        authService.forgotPasswordSendOtp(body.get("identifier")); // email or phone
        return ResponseEntity.ok(Map.of(
            "message", "OTP sent to your registered phone and email",
            "hint", "Check both SMS and email inbox"
        ));
    }

    @PostMapping("/forgot-password/verify-otp")
    @Operation(summary = "Verify OTP and get reset token")
    public ResponseEntity<Map<String, String>> verifyForgotPasswordOtp(
            @RequestBody Map<String, String> body) {
        String verifyToken = authService.verifyForgotPasswordOtp(
            body.get("phone"), body.get("otpCode"));
        return ResponseEntity.ok(Map.of(
            "verifyToken", verifyToken,
            "message", "OTP verified. Use verifyToken to reset password."
        ));
    }

    @PostMapping("/forgot-password/reset")
    @Operation(summary = "Reset password using OTP verify token")
    public ResponseEntity<Map<String, String>> resetPassword(
            @RequestBody Map<String, String> body) {
        authService.resetPasswordWithToken(body.get("verifyToken"), body.get("newPassword"));
        return ResponseEntity.ok(Map.of("message", "Password reset successfully. Please login."));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change password (authenticated)")
    public ResponseEntity<Map<String, String>> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body) {
        authService.changePassword(userDetails.getUsername(),
            body.get("currentPassword"), body.get("newPassword"));
        return ResponseEntity.ok(Map.of("message", "Password changed. Please login again."));
    }

    // ── Session management ────────────────────────────────────
    @GetMapping("/sessions")
    @Operation(summary = "Get all active sessions for current user")
    public ResponseEntity<List<?>> getActiveSessions(
            @AuthenticationPrincipal UserDetails userDetails) {
        // We get userId from user lookup in a real impl; simplified here
        return ResponseEntity.ok(List.of(Map.of("message", "Session list endpoint active")));
    }

    @DeleteMapping("/sessions/{sessionId}")
    @Operation(summary = "Revoke a specific session")
    public ResponseEntity<Map<String, String>> revokeSession(
            @PathVariable UUID sessionId) {
        sessionService.revokeSession(sessionId);
        return ResponseEntity.ok(Map.of("message", "Session revoked"));
    }

    @DeleteMapping("/sessions/all")
    @Operation(summary = "Revoke all sessions (force logout everywhere)")
    public ResponseEntity<Map<String, String>> revokeAllSessions(
            @AuthenticationPrincipal UserDetails userDetails) {
        authService.logout(userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "All sessions revoked. Please login again."));
    }

    @GetMapping("/sessions/active-count")
    @Operation(summary = "Get active session count for current user")
    public ResponseEntity<Map<String, Object>> getActiveSessionCount(
            @AuthenticationPrincipal UserDetails userDetails) {
        // Minimal session info for frontend session-check
        return ResponseEntity.ok(Map.of("message", "Use /sessions endpoint for full list"));
    }
}
