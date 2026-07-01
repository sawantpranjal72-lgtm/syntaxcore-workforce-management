package com.syntaxcore.workforce.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "working_schedule")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkingSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Comma-separated working days, e.g. "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"
     */
    @Column(name = "working_days", nullable = false)
    @Builder.Default
    private String workingDays = "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY";

    @Column(name = "work_start_time", nullable = false)
    @Builder.Default
    private String workStartTime = "09:00";   // HH:mm IST

    @Column(name = "work_end_time", nullable = false)
    @Builder.Default
    private String workEndTime = "18:00";     // HH:mm IST

    @Column(name = "working_hours_per_day", nullable = false)
    @Builder.Default
    private double workingHoursPerDay = 8.0;

    @Column(name = "grace_minutes")
    @Builder.Default
    private int graceMinutes = 15;           // Late threshold in minutes
}
