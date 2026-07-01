package com.syntaxcore.workforce.controller;

import com.syntaxcore.workforce.dto.response.DashboardAnalyticsResponse;
import com.syntaxcore.workforce.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "Dashboard analytics and reporting")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER','PROJECT_MANAGER')")
    @Operation(summary = "Get admin dashboard analytics")
    public ResponseEntity<DashboardAnalyticsResponse> getDashboard() {
        return ResponseEntity.ok(analyticsService.getDashboardAnalytics());
    }

    @GetMapping("/my-dashboard")
    @Operation(summary = "Get personal dashboard for current user")
    public ResponseEntity<Map<String, Object>> getMyDashboard(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(analyticsService.getEmployeeDashboard(userDetails.getUsername()));
    }
}
