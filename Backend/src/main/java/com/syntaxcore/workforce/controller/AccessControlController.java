package com.syntaxcore.workforce.controller;

import com.syntaxcore.workforce.dto.request.ExamPermissionsUpdateRequest;
import com.syntaxcore.workforce.dto.request.FeatureFlagsUpdateRequest;
import com.syntaxcore.workforce.dto.request.MenuAccessUpdateRequest;
import com.syntaxcore.workforce.dto.response.AccessControlSettingsResponse;
import com.syntaxcore.workforce.service.AccessControlSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Tag(name = "Access Control", description = "Role menu and feature access settings")
public class AccessControlController {

    private final AccessControlSettingsService accessControlSettingsService;

    @GetMapping("/api/v1/access-control")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get effective role menu and feature access settings")
    public ResponseEntity<AccessControlSettingsResponse> getSettings() {
        return ResponseEntity.ok(accessControlSettingsService.getSettings());
    }

    @PutMapping("/api/v1/admin/access-control/menu-access")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Update role menu access settings")
    public ResponseEntity<AccessControlSettingsResponse> updateMenuAccess(@RequestBody MenuAccessUpdateRequest request) {
        return ResponseEntity.ok(accessControlSettingsService.updateMenuAccess(request.getMenuAccess()));
    }

    @PutMapping("/api/v1/admin/access-control/feature-flags")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Update feature flags")
    public ResponseEntity<AccessControlSettingsResponse> updateFeatureFlags(@RequestBody FeatureFlagsUpdateRequest request) {
        return ResponseEntity.ok(accessControlSettingsService.updateFeatureFlags(request.getFeatureFlags()));
    }

    @PutMapping("/api/v1/admin/access-control/exam-permissions")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Update which roles can manage (create/edit/delete/publish) exams vs only take them")
    public ResponseEntity<AccessControlSettingsResponse> updateExamPermissions(@RequestBody ExamPermissionsUpdateRequest request) {
        return ResponseEntity.ok(accessControlSettingsService.updateExamPermissions(request.getExamPermissions()));
    }
}
