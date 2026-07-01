package com.syntaxcore.workforce.controller;

import com.syntaxcore.workforce.dto.response.*;
import com.syntaxcore.workforce.enums.Role;
import com.syntaxcore.workforce.repository.ActivityLogRepository;
import com.syntaxcore.workforce.repository.ProjectRepository;
import com.syntaxcore.workforce.repository.TaskRepository;
import com.syntaxcore.workforce.repository.UserRepository;
import com.syntaxcore.workforce.repository.UserSessionRepository;
import com.syntaxcore.workforce.enums.ProjectStatus;
import com.syntaxcore.workforce.enums.TaskStatus;
import com.syntaxcore.workforce.service.SessionService;
import com.syntaxcore.workforce.service.UserService;
import com.syntaxcore.workforce.util.EntityMapper;
import com.syntaxcore.workforce.util.UserMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Super Admin", description = "Super Admin only — full system control")
public class SuperAdminController {

    private final UserService             userService;
    private final UserRepository          userRepository;
    private final UserSessionRepository   sessionRepository;
    private final ActivityLogRepository   activityLogRepository;
    private final ProjectRepository       projectRepository;
    private final TaskRepository          taskRepository;
    private final SessionService          sessionService;
    private final UserMapper              userMapper;
    private final EntityMapper            entityMapper;
    private final PasswordEncoder         passwordEncoder;

    // ── User Management ──────────────────────────────────────

    @GetMapping("/users")
    @Operation(summary = "Get ALL users including deleted")
    public ResponseEntity<PagedResponse<UserSummaryResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<UserSummaryResponse> mapped = userRepository
                .findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()))
                .map(userMapper::toSummaryResponse);
        return ResponseEntity.ok(PagedResponse.from(mapped));
    }

    @PatchMapping("/users/{id}/role")
    @Operation(summary = "Change any user's role")
    public ResponseEntity<Map<String, String>> changeUserRole(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        try {
            Role newRole = Role.valueOf(body.get("role"));
            userRepository.findById(id).ifPresent(u -> {
                u.setRole(newRole);
                userRepository.save(u);
            });
            return ResponseEntity.ok(Map.of("message", "Role updated to " + newRole.getDisplayName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role: " + body.get("role")));
        }
    }

    @PatchMapping("/users/{id}/reset-password")
    @Operation(summary = "Force-reset any user's password")
    public ResponseEntity<Map<String, String>> adminResetPassword(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String newPwd = body.get("newPassword");
        if (newPwd == null || newPwd.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 8 characters"));
        }
        userRepository.findById(id).ifPresent(u -> {
            u.setPassword(passwordEncoder.encode(newPwd));
            userRepository.save(u);
            sessionService.revokeAllUserSessions(id);
        });
        return ResponseEntity.ok(Map.of("message", "Password reset and sessions revoked"));
    }

    @DeleteMapping("/users/{id}/hard-delete")
    @Operation(summary = "Permanently delete a user")
    public ResponseEntity<Map<String, String>> hardDeleteUser(@PathVariable UUID id) {
        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "User permanently deleted"));
    }

    @PatchMapping("/users/{id}/restore")
    @Operation(summary = "Restore a soft-deleted user")
    public ResponseEntity<Map<String, String>> restoreUser(@PathVariable UUID id) {
        userRepository.findById(id).ifPresent(u -> {
            u.setDeleted(false);
            u.setActive(true);
            u.setDeletedAt(null);
            userRepository.save(u);
        });
        return ResponseEntity.ok(Map.of("message", "User restored"));
    }

    @PatchMapping("/users/{id}/activate")
    @Operation(summary = "Activate or deactivate user account")
    public ResponseEntity<Map<String, String>> toggleActivation(
            @PathVariable UUID id,
            @RequestBody Map<String, Boolean> body) {
        boolean active = Boolean.TRUE.equals(body.get("active"));
        userRepository.findById(id).ifPresent(u -> {
            u.setActive(active);
            userRepository.save(u);
            if (!active) sessionService.revokeAllUserSessions(id);
        });
        return ResponseEntity.ok(Map.of("message", "Activation status updated"));
    }

    @PatchMapping("/users/{id}/verify-email")
    @Operation(summary = "Manually verify a user's email")
    public ResponseEntity<Map<String, String>> verifyEmail(@PathVariable UUID id) {
        userRepository.findById(id).ifPresent(u -> {
            u.setEmailVerified(true);
            u.setEmailVerificationToken(null);
            userRepository.save(u);
        });
        return ResponseEntity.ok(Map.of("message", "Email verified"));
    }

    // ── Session Management ───────────────────────────────────

    @GetMapping("/sessions")
    @Operation(summary = "View all sessions system-wide — optionally filtered by date range")
    public ResponseEntity<PagedResponse<UserSessionResponse>> getAllSessions(
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "200") int size,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime from,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime to) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<UserSessionResponse> mapped;
        if (from != null || to != null) {
            mapped = sessionRepository.findByDateRange(from, to, pageable)
                .map(entityMapper::toUserSessionResponse);
        } else {
            mapped = sessionRepository.findAll(pageable)
                .map(entityMapper::toUserSessionResponse);
        }
        return ResponseEntity.ok(PagedResponse.from(mapped));
    }

    @DeleteMapping("/sessions/user/{userId}")
    @Operation(summary = "Force logout all sessions for a user")
    public ResponseEntity<Map<String, String>> forceLogout(@PathVariable UUID userId) {
        sessionService.revokeAllUserSessions(userId);
        return ResponseEntity.ok(Map.of("message", "All sessions revoked for user " + userId));
    }

    @GetMapping("/sessions/user/{userId}")
    @Operation(summary = "View all sessions for a specific user")
    public ResponseEntity<java.util.List<UserSessionResponse>> getUserSessions(@PathVariable UUID userId) {
        java.util.List<UserSessionResponse> sessions = sessionService.getActiveSessions(userId)
                .stream()
                .map(entityMapper::toUserSessionResponse)
                .toList();
        return ResponseEntity.ok(sessions);
    }

    // ── Audit Logs ───────────────────────────────────────────

    @GetMapping("/activity-logs")
    @Operation(summary = "Full system audit log")
    public ResponseEntity<PagedResponse<ActivityLogResponse>> getActivityLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<ActivityLogResponse> mapped = activityLogRepository
                .findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
                .map(log -> entityMapper.toActivityLogResponse(log, userMapper));
        return ResponseEntity.ok(PagedResponse.from(mapped));
    }

    // ── System Stats ─────────────────────────────────────────

    @GetMapping("/system-stats")
    @Operation(summary = "System-wide statistics")
    public ResponseEntity<Map<String, Object>> getSystemStats() {
        long totalUsers     = userRepository.count();
        long activeUsers    = userRepository.countActiveUsers();
        long activeSessions = sessionRepository.countAllActiveSessions();
        long totalProjects  = projectRepository.count();
        long activeProjects = projectRepository.countByStatusAndDeletedFalse(ProjectStatus.ACTIVE);
        long pendingTasks   = taskRepository.countByStatus(TaskStatus.PENDING);
        return ResponseEntity.ok(Map.of(
            "totalUsers",     totalUsers,
            "activeUsers",    activeUsers,
            "activeSessions", activeSessions,
            "totalProjects",  totalProjects,
            "activeProjects", activeProjects,
            "pendingTasks",   pendingTasks,
            "systemStatus",   "HEALTHY"
        ));
    }
}
