package com.syntaxcore.workforce.util;

import com.syntaxcore.workforce.dto.response.*;
import com.syntaxcore.workforce.entity.*;
import org.springframework.stereotype.Component;

@Component
public class EntityMapper {

    // ── Department ────────────────────────────────────────────

    public DepartmentResponse toDepartmentResponse(Department dept) {
        if (dept == null) return null;
        return DepartmentResponse.builder()
                .id(dept.getId())
                .name(dept.getName())
                .code(dept.getCode())
                .description(dept.getDescription())
                .active(dept.isActive())
                .managerId(dept.getManager() != null ? dept.getManager().getId() : null)
                .managerName(dept.getManager() != null ? dept.getManager().getFullName() : null)
                .managerAvatar(dept.getManager() != null ? dept.getManager().getAvatarUrl() : null)
                .employeeCount(dept.getEmployees() != null ? dept.getEmployees().size() : 0)
                .createdAt(dept.getCreatedAt())
                .updatedAt(dept.getUpdatedAt())
                .build();
    }

    // ── Leave ─────────────────────────────────────────────────

    public LeaveResponse toLeaveResponse(LeaveRequest leave) {
        if (leave == null) return null;
        return LeaveResponse.builder()
                .id(leave.getId())
                .userId(leave.getUser() != null ? leave.getUser().getId() : null)
                .userName(leave.getUser() != null ? leave.getUser().getFullName() : null)
                .userAvatar(leave.getUser() != null ? leave.getUser().getAvatarUrl() : null)
                .userEmployeeId(leave.getUser() != null ? leave.getUser().getEmployeeId() : null)
                .userRole(leave.getUser() != null && leave.getUser().getRole() != null
                    ? leave.getUser().getRole().getDisplayName() : null)
                .leaveType(leave.getLeaveType())
                .startDate(leave.getStartDate())
                .endDate(leave.getEndDate())
                .totalDays(leave.getTotalDays())
                .reason(leave.getReason())
                .status(leave.getStatus())
                .halfDay(leave.isHalfDay())
                .reviewedById(leave.getReviewedBy() != null ? leave.getReviewedBy().getId() : null)
                .reviewedByName(leave.getReviewedBy() != null ? leave.getReviewedBy().getFullName() : null)
                .reviewComment(leave.getReviewComment())
                .createdAt(leave.getCreatedAt())
                .updatedAt(leave.getUpdatedAt())
                .build();
    }

    // ── ActivityLog ───────────────────────────────────────────

    public ActivityLogResponse toActivityLogResponse(ActivityLog log, UserMapper userMapper) {
        if (log == null) return null;
        return ActivityLogResponse.builder()
                .id(log.getId())
                .action(log.getAction())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .description(log.getDescription())
                .oldValue(log.getOldValue())
                .newValue(log.getNewValue())
                .user(log.getUser() != null ? userMapper.toSummaryResponse(log.getUser()) : null)
                .createdAt(log.getCreatedAt())
                .build();
    }

    // ── UserSession ───────────────────────────────────────────

    public UserSessionResponse toUserSessionResponse(UserSession session) {
        if (session == null) return null;
        return UserSessionResponse.builder()
                .id(session.getId())
                .userId(session.getUser() != null ? session.getUser().getId() : null)
                .userName(session.getUser() != null ? session.getUser().getFullName() : null)
                .ipAddress(session.getIpAddress())
                .userAgent(session.getUserAgent())
                .deviceType(session.getDeviceType())
                .location(session.getLocation())
                .active(session.isActive())
                .lastActivity(session.getLastActivity())
                .expiresAt(session.getExpiresAt())
                .createdAt(session.getCreatedAt())
                .build();
    }
}
