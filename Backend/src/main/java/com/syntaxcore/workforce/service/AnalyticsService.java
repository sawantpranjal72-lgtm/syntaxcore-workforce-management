package com.syntaxcore.workforce.service;

import com.syntaxcore.workforce.dto.response.DashboardAnalyticsResponse;
import java.util.Map;

public interface AnalyticsService {
    DashboardAnalyticsResponse getDashboardAnalytics();
    Map<String, Object> getEmployeeDashboard(String userEmail);
}
