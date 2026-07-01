package com.syntaxcore.workforce.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveResponse {
    private UUID id;
    private UUID userId;
    private String userName;
    private String userAvatar;
    private String userEmployeeId;
    private String userRole;
    private String leaveType;
    private LocalDate startDate;
    private LocalDate endDate;
    private int totalDays;
    private String reason;
    private String status;
    private boolean halfDay;
    private UUID reviewedById;
    private String reviewedByName;
    private String reviewComment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
