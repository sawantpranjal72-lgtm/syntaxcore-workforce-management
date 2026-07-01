package com.syntaxcore.workforce.controller;

import com.syntaxcore.workforce.dto.response.UserDetailResponse;
import com.syntaxcore.workforce.entity.User;
import com.syntaxcore.workforce.enums.Role;
import com.syntaxcore.workforce.repository.UserRepository;
import com.syntaxcore.workforce.util.UserMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

/**
 * One-time setup endpoint — creates the initial SUPER_ADMIN.
 * Automatically disables itself once any SUPER_ADMIN exists.
 */
@RestController
@RequestMapping("/api/v1/setup")
@RequiredArgsConstructor
@Tag(name = "Setup", description = "First-run setup — disabled after initial Super Admin is created")
public class SetupController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    @GetMapping("/status")
    @Operation(summary = "Check whether setup has been completed")
    public ResponseEntity<Map<String, Object>> status() {
        boolean completed = userRepository.findByRoleAndDeletedFalse(Role.SUPER_ADMIN).size() > 0;
        return ResponseEntity.ok(Map.of(
            "setupCompleted", completed,
            "message", completed
                ? "Setup already completed. This endpoint is now disabled."
                : "No Super Admin found. POST /api/v1/setup/create to create the first Super Admin."
        ));
    }

    @PostMapping("/create")
    @Transactional
    @Operation(summary = "Create the first Super Admin (disabled after first use)")
    public ResponseEntity<?> createSuperAdmin(@RequestBody Map<String, String> body) {
        // Guard: only allow if no super admin exists
        if (!userRepository.findByRoleAndDeletedFalse(Role.SUPER_ADMIN).isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Setup already completed. Super Admin already exists."));
        }

        String email     = body.get("email");
        String password  = body.get("password");
        String firstName = body.getOrDefault("firstName", "Super");
        String lastName  = body.getOrDefault("lastName",  "Admin");

        if (email == null || password == null) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "email and password are required"));
        }
        if (password.length() < 8) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Password must be at least 8 characters"));
        }
        if (userRepository.existsByEmailIgnoreCaseAndDeletedFalse(email)) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Email already in use"));
        }

        User admin = User.builder()
            .firstName(firstName)
            .lastName(lastName)
            .email(email.toLowerCase().trim())
            .password(passwordEncoder.encode(password))
            .role(Role.SUPER_ADMIN)
            .employeeId("SC-0001")
            .active(true)
            .emailVerified(true)
            .dateOfJoining(LocalDate.now())
            .build();

        User saved = userRepository.save(admin);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of(
                "message", "Super Admin created successfully. This endpoint is now disabled.",
                "user", userMapper.toDetailResponse(saved)
            ));
    }
}
