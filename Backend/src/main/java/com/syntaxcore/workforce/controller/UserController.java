package com.syntaxcore.workforce.controller;

import com.syntaxcore.workforce.dto.request.RegisterRequest;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import com.syntaxcore.workforce.dto.response.UserDetailResponse;
import com.syntaxcore.workforce.dto.response.UserSummaryResponse;
import com.syntaxcore.workforce.enums.Role;
import com.syntaxcore.workforce.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "Employee and user management")
public class UserController {

    private final UserService userService;
    private final com.syntaxcore.workforce.repository.UserRepository userRepository;
    private final com.syntaxcore.workforce.util.UserMapper userMapper;

    @GetMapping("/me")
    @Operation(summary = "Get current user profile")
    public ResponseEntity<UserDetailResponse> getMyProfile(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.getMyProfile(userDetails.getUsername()));
    }

    @PutMapping("/me")
    @Operation(summary = "Update current user profile")
    public ResponseEntity<UserDetailResponse> updateMyProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(userService.updateMyProfile(userDetails.getUsername(), request));
    }

    @PostMapping("/me/avatar")
    @Operation(summary = "Upload profile avatar")
    public ResponseEntity<Map<String, String>> uploadAvatar(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("file") MultipartFile file) {
        String url = userService.uploadAvatar(userDetails.getUsername(), file);
        return ResponseEntity.ok(Map.of("avatarUrl", url));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all users with filters")
    public ResponseEntity<PagedResponse<UserSummaryResponse>> getAllUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) UUID departmentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        return ResponseEntity.ok(userService.getAllUsers(search, role, departmentId, PageRequest.of(page, size, sort)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID")
    public ResponseEntity<UserDetailResponse> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER')")
    @Operation(summary = "Update user by ID")
    public ResponseEntity<UserDetailResponse> updateUser(
            @PathVariable UUID id,
            @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Delete user")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER')")
    @Operation(summary = "Toggle user active/inactive")
    public ResponseEntity<Map<String, String>> toggleStatus(@PathVariable UUID id) {
        userService.toggleUserStatus(id);
        return ResponseEntity.ok(Map.of("message", "User status updated"));
    }

    @GetMapping("/by-department/{departmentId}")
    @Operation(summary = "Get users by department")
    public ResponseEntity<List<UserSummaryResponse>> getUsersByDepartment(@PathVariable UUID departmentId) {
        return ResponseEntity.ok(userService.getUsersByDepartment(departmentId));
    }

    @GetMapping("/assignable")
    @Operation(summary = "Get all active users who can be assigned tasks")
    public ResponseEntity<List<UserSummaryResponse>> getAssignableUsers() {
        return ResponseEntity.ok(userRepository.findAssignableUsers()
            .stream()
            .map(userMapper::toSummaryResponse)
            .collect(java.util.stream.Collectors.toList()));
    }

    @GetMapping("/by-role/{role}")
    @Operation(summary = "Get users by role")
    public ResponseEntity<List<UserSummaryResponse>> getUsersByRole(@PathVariable Role role) {
        return ResponseEntity.ok(userService.getUsersByRole(role));
    }
}
