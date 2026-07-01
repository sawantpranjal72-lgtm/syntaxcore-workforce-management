package com.syntaxcore.workforce.controller;

import com.syntaxcore.workforce.dto.response.DashboardAnalyticsResponse;
import com.syntaxcore.workforce.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Dashboard compatibility endpoints")
public class DashboardController {

    private final AnalyticsService analyticsService;

    @GetMapping("/analytics")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get dashboard analytics — available to every authenticated role since the dashboard loads it unconditionally for everyone")
    public ResponseEntity<DashboardAnalyticsResponse> getDashboardAnalytics() {
        return ResponseEntity.ok(analyticsService.getDashboardAnalytics());
    }
}
