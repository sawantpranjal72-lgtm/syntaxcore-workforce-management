package com.syntaxcore.workforce.controller;

import com.syntaxcore.workforce.entity.LeaveEmailConfig;
import com.syntaxcore.workforce.repository.LeaveEmailConfigRepository;
import com.syntaxcore.workforce.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Leave Email Config", description = "Manage who receives leave request notification emails")
@RestController
@RequestMapping("/api/v1/leave-email-config")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER')")
public class LeaveEmailConfigController {

    private final LeaveEmailConfigRepository configRepo;
    private final UserRepository userRepo;

    @GetMapping
    @Operation(summary = "Get all configured leave email recipients")
    public ResponseEntity<List<LeaveEmailConfig>> getAll() {
        return ResponseEntity.ok(configRepo.findByDeletedFalse());
    }

    @PostMapping
    @Operation(summary = "Add a new leave email recipient")
    public ResponseEntity<LeaveEmailConfig> add(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails ud) {

        String email = body.get("email");
        if (email == null || email.isBlank())
            return ResponseEntity.badRequest().build();

        LeaveEmailConfig config = LeaveEmailConfig.builder()
            .email(email.trim().toLowerCase())
            .displayName(body.getOrDefault("displayName", email))
            .leaveTypes(body.get("leaveTypes"))
            .active(true)
            .build();

        userRepo.findByEmailIgnoreCaseAndDeletedFalse(ud.getUsername()).ifPresent(config::setAddedBy);

        return ResponseEntity.ok(configRepo.save(config));
    }

    @PatchMapping("/{id}/toggle")
    @Operation(summary = "Enable or disable a recipient")
    public ResponseEntity<LeaveEmailConfig> toggle(@PathVariable UUID id) {
        return configRepo.findById(id).map(cfg -> {
            cfg.setActive(!cfg.isActive());
            return ResponseEntity.ok(configRepo.save(cfg));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Remove a leave email recipient")
    public ResponseEntity<Map<String, String>> delete(@PathVariable UUID id) {
        configRepo.findById(id).ifPresent(cfg -> {
            cfg.setDeleted(true);
            configRepo.save(cfg);
        });
        return ResponseEntity.ok(Map.of("message", "Recipient removed"));
    }
}
