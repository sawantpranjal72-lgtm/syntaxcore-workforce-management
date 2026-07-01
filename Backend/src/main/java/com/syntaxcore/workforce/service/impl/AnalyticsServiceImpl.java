package com.syntaxcore.workforce.service.impl;

import com.syntaxcore.workforce.dto.response.DashboardAnalyticsResponse;
import com.syntaxcore.workforce.dto.response.UserSummaryResponse;
import com.syntaxcore.workforce.entity.User;
import com.syntaxcore.workforce.enums.ProjectStatus;
import com.syntaxcore.workforce.enums.TaskStatus;
import com.syntaxcore.workforce.repository.*;
import com.syntaxcore.workforce.service.AnalyticsService;
import com.syntaxcore.workforce.util.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnalyticsServiceImpl implements AnalyticsService {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final AttendanceRepository attendanceRepository;
    private final ActivityLogRepository activityLogRepository;
    private final UserMapper userMapper;

    @Override
    public DashboardAnalyticsResponse getDashboardAnalytics() {
        long totalEmployees = userRepository.count();
        long activeEmployees = userRepository.countActiveUsers();
        long totalProjects = projectRepository.count();
        long activeProjects = projectRepository.countByStatusAndDeletedFalse(ProjectStatus.ACTIVE);
        long totalTasks = taskRepository.count();
        long pendingTasks = taskRepository.countByStatus(TaskStatus.PENDING);
        long inProgressTasks = taskRepository.countByStatus(TaskStatus.IN_PROGRESS);
        long completedTasks = taskRepository.countByStatus(TaskStatus.COMPLETED);
        long overdueTasks = taskRepository.findOverdueTasks(LocalDateTime.now()).size();
        long todayCheckIns = attendanceRepository.findByDateRange(LocalDate.now(), LocalDate.now()).size();

        // Task status distribution
        List<Map<String, Object>> taskStatusDist = List.of(
            Map.of("name", "Pending", "value", pendingTasks, "color", "#f59e0b"),
            Map.of("name", "In Progress", "value", inProgressTasks, "color", "#3b82f6"),
            Map.of("name", "Completed", "value", completedTasks, "color", "#10b981"),
            Map.of("name", "Overdue", "value", overdueTasks, "color", "#ef4444")
        );

        // Weekly task activity (last 7 days) — real check-in counts
        List<Map<String, Object>> weeklyActivity = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = LocalDate.now().minusDays(i);
            long checkIns = attendanceRepository.countCheckInsForDate(day);
            weeklyActivity.add(Map.of(
                "date", day.toString(),
                "day", day.getDayOfWeek().name().substring(0, 3),
                "tasks", checkIns
            ));
        }

        // Project status distribution
        List<Map<String, Object>> projectStatusDist = Arrays.stream(ProjectStatus.values())
            .map(s -> Map.<String, Object>of("name", s.name(), "value", projectRepository.countByStatusAndDeletedFalse(s)))
            .toList();

        // Recent activities
        var recentActivities = activityLogRepository
            .findAllByOrderByCreatedAtDesc(PageRequest.of(0, 10))
            .getContent()
            .stream()
            .map(a -> com.syntaxcore.workforce.dto.response.ActivityLogResponse.builder()
                .id(a.getId())
                .action(a.getAction())
                .description(a.getDescription())
                .entityType(a.getEntityType())
                .entityId(a.getEntityId())
                .user(a.getUser() != null ? userMapper.toSummaryResponse(a.getUser()) : null)
                .createdAt(a.getCreatedAt())
                .build())
            .toList();

        return DashboardAnalyticsResponse.builder()
            .totalEmployees(totalEmployees)
            .activeEmployees(activeEmployees)
            .totalProjects(totalProjects)
            .activeProjects(activeProjects)
            .totalTasks(totalTasks)
            .pendingTasks(pendingTasks)
            .inProgressTasks(inProgressTasks)
            .completedTasks(completedTasks)
            .overdueTasks(overdueTasks)
            .todayCheckIns(todayCheckIns)
            .taskStatusDistribution(taskStatusDist)
            .projectStatusDistribution(projectStatusDist)
            .weeklyTaskActivity(weeklyActivity)
            .recentActivities(recentActivities)
            .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getEmployeeDashboard(String userEmail) {
        User user = userRepository.findByEmailIgnoreCaseAndDeletedFalse(userEmail)
            .orElseThrow(() -> new com.syntaxcore.workforce.exception.ResourceNotFoundException("User", userEmail));

        long pending    = taskRepository.countByAssigneeAndStatus(user.getId(), TaskStatus.PENDING);
        long inProgress = taskRepository.countByAssigneeAndStatus(user.getId(), TaskStatus.IN_PROGRESS);
        long completed  = taskRepository.countByAssigneeAndStatus(user.getId(), TaskStatus.COMPLETED);
        long assigned   = pending + inProgress;

        // Real attendance percentage for current month
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalDate monthStart = today.withDayOfMonth(1);
        double attendancePct = attendanceRepository
            .countPresentDays(user.getId(), monthStart, today) * 100.0
            / Math.max(1, monthStart.until(today).getDays() + 1);

        return Map.of(
            "assignedTasks",        assigned,
            "completedTasks",       completed,
            "pendingTasks",         pending,
            "inProgressTasks",      inProgress,
            "attendancePercentage", Math.round(attendancePct * 10.0) / 10.0,
            "productivityScore",    completed == 0 ? 0.0
                                    : Math.round(completed * 100.0 / Math.max(1, assigned + completed) * 10.0) / 10.0
        );
    }
}
