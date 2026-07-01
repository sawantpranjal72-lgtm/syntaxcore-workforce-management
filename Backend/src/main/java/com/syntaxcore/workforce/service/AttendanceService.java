package com.syntaxcore.workforce.service;

import com.syntaxcore.workforce.dto.response.AttendanceResponse;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AttendanceService {
    AttendanceResponse checkIn(String userEmail, String location, boolean remote, Double latitude, Double longitude, String photo);
    AttendanceResponse checkOut(String userEmail, String location, Double latitude, Double longitude, String photo);
    AttendanceResponse getTodayAttendance(String userEmail);
    PagedResponse<AttendanceResponse> getAttendanceHistory(String userEmail, Pageable pageable);
    List<AttendanceResponse> getAttendanceByDateRange(UUID userId, LocalDate start, LocalDate end);
    List<AttendanceResponse> getAllAttendanceByDate(LocalDate date);
    double getAttendancePercentage(UUID userId, LocalDate start, LocalDate end);
}
