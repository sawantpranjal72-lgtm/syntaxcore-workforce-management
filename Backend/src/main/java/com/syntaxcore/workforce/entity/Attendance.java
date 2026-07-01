package com.syntaxcore.workforce.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance", indexes = {
    @Index(name = "idx_attendance_user", columnList = "user_id"),
    @Index(name = "idx_attendance_date", columnList = "date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attendance extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "check_in")
    private LocalDateTime checkIn;

    @Column(name = "check_out")
    private LocalDateTime checkOut;

    @Column(name = "total_hours")
    private Double totalHours;

    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "PRESENT"; // PRESENT, ABSENT, LATE, HALF_DAY, LEAVE

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "location")
    private String location;

    /** GPS latitude at check-in time, captured in the browser. */
    @Column(name = "check_in_latitude")
    private Double checkInLatitude;

    /** GPS longitude at check-in time, captured in the browser. */
    @Column(name = "check_in_longitude")
    private Double checkInLongitude;

    /** Human-readable location label at check-in (reverse-geocoded or manually entered). */
    @Column(name = "check_in_location")
    private String checkInLocation;

    /** Base64 / URL of the selfie taken at check-in time. */
    @Column(name = "check_in_photo", columnDefinition = "TEXT")
    private String checkInPhoto;

    /** GPS latitude at check-out time. */
    @Column(name = "check_out_latitude")
    private Double checkOutLatitude;

    /** GPS longitude at check-out time. */
    @Column(name = "check_out_longitude")
    private Double checkOutLongitude;

    /** Human-readable location label at check-out. */
    @Column(name = "check_out_location")
    private String checkOutLocation;

    /** Base64 / URL of the selfie taken at check-out time. */
    @Column(name = "check_out_photo", columnDefinition = "TEXT")
    private String checkOutPhoto;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "is_remote")
    @Builder.Default
    private boolean remote = false;
}
