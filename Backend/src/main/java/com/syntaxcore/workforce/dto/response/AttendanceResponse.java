package com.syntaxcore.workforce.dto.response;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceResponse {
    private UUID id;
    private UUID userId;
    private String userName;
    private String userAvatar;
    private LocalDate date;
    private LocalDateTime checkIn;
    private LocalDateTime checkOut;
    private Double totalHours;
    private String status;
    private String notes;
    private String location;
    private boolean remote;
    private Double checkInLatitude;
    private Double checkInLongitude;
    private String checkInLocation;
    private String checkInPhoto;
    private Double checkOutLatitude;
    private Double checkOutLongitude;
    private String checkOutLocation;
    private String checkOutPhoto;
}
