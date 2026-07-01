package com.syntaxcore.workforce.dto.response;

import lombok.*;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardAnalyticsResponse {
    // Overview Stats
    private long totalEmployees;
    private long activeEmployees;
    private long totalProjects;
    private long activeProjects;
    private long totalTasks;
    private long pendingTasks;
    private long inProgressTasks;
    private long completedTasks;
    private long overdueTasks;
    private long todayCheckIns;

    // Charts data
    private List<Map<String, Object>> taskStatusDistribution;
    private List<Map<String, Object>> taskCompletionTrend;
    private List<Map<String, Object>> projectStatusDistribution;
    private List<Map<String, Object>> teamPerformance;
    private List<Map<String, Object>> attendanceOverview;
    private List<Map<String, Object>> weeklyTaskActivity;

    // Recent activities
    private List<ActivityLogResponse> recentActivities;

    // Top performers
    private List<UserSummaryResponse> topPerformers;
}
