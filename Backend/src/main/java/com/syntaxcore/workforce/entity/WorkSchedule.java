package com.syntaxcore.workforce.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Admin-configurable work schedule that defines working days,
 * standard hours and grace periods for attendance calculations.
 */
@Entity
@Table(name = "work_schedule")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkSchedule extends BaseEntity {

    /** Human-readable name, e.g. "Default", "Shift A" */
    @Column(name = "name", nullable = false, length = 100)
    @Builder.Default
    private String name = "Default";

    /** Comma-separated day numbers: 1=Mon … 7=Sun  e.g. "1,2,3,4,5" */
    @Column(name = "working_days", nullable = false, length = 20)
    @Builder.Default
    private String workingDays = "1,2,3,4,5";

    /** Standard work hours per day (e.g. 8.0) */
    @Column(name = "standard_hours_per_day", nullable = false)
    @Builder.Default
    private BigDecimal standardHoursPerDay = BigDecimal.valueOf(8.0);

    /** Weekly hours threshold (e.g. 40.0) */
    @Column(name = "standard_hours_per_week", nullable = false)
    @Builder.Default
    private BigDecimal standardHoursPerWeek = BigDecimal.valueOf(40.0);

    /** Grace period in minutes before marking LATE (e.g. 15) */
    @Column(name = "grace_period_minutes", nullable = false)
    @Builder.Default
    private Integer gracePeriodMinutes = 15;

    /** Expected check-in time as HH:mm string (e.g. "09:00") */
    @Column(name = "check_in_time", length = 10)
    @Builder.Default
    private String checkInTime = "09:00";

    /** Expected check-out time as HH:mm string (e.g. "18:00") */
    @Column(name = "check_out_time", length = 10)
    @Builder.Default
    private String checkOutTime = "18:00";

    /** Half-day threshold in hours (e.g. 4.0) */
    @Column(name = "half_day_threshold_hours")
    @Builder.Default
    private BigDecimal halfDayThresholdHours = BigDecimal.valueOf(4.0);

    /** Whether this is the active/default schedule */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;
}
