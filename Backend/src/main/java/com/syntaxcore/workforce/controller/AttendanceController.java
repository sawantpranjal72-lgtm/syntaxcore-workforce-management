package com.syntaxcore.workforce.controller;

import com.syntaxcore.workforce.dto.response.AttendanceResponse;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import com.syntaxcore.workforce.entity.WorkingSchedule;
import com.syntaxcore.workforce.repository.WorkingScheduleRepository;
import com.syntaxcore.workforce.repository.AttendanceRepository;
import com.syntaxcore.workforce.repository.UserRepository;
import com.syntaxcore.workforce.entity.Attendance;
import com.syntaxcore.workforce.entity.User;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Set;
import java.util.stream.Collectors;
import com.syntaxcore.workforce.service.AttendanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
@Tag(name = "Attendance", description = "Check-in/out and attendance tracking")
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final WorkingScheduleRepository workingScheduleRepository;
    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;

    @PostMapping("/check-in")
    @Operation(summary = "Check in for today — accepts GPS coordinates, location label, and a selfie photo")
    public ResponseEntity<AttendanceResponse> checkIn(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody(required = false) Map<String, Object> body) {
        String location   = body != null ? (String)  body.getOrDefault("location",  "Office") : "Office";
        boolean remote    = body != null && Boolean.TRUE.equals(body.get("remote"));
        Double  lat       = body != null && body.get("latitude")  != null ? ((Number) body.get("latitude")).doubleValue()  : null;
        Double  lng       = body != null && body.get("longitude") != null ? ((Number) body.get("longitude")).doubleValue() : null;
        String  photo     = body != null ? (String) body.get("photo")    : null;
        return ResponseEntity.ok(attendanceService.checkIn(userDetails.getUsername(), location, remote, lat, lng, photo));
    }

    @PostMapping("/check-out")
    @Operation(summary = "Check out for today — accepts GPS coordinates, location label, and a selfie photo")
    public ResponseEntity<AttendanceResponse> checkOut(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody(required = false) Map<String, Object> body) {
        String location = body != null ? (String) body.getOrDefault("location", null) : null;
        Double lat      = body != null && body.get("latitude")  != null ? ((Number) body.get("latitude")).doubleValue()  : null;
        Double lng      = body != null && body.get("longitude") != null ? ((Number) body.get("longitude")).doubleValue() : null;
        String photo    = body != null ? (String) body.get("photo") : null;
        return ResponseEntity.ok(attendanceService.checkOut(userDetails.getUsername(), location, lat, lng, photo));
    }

    @GetMapping("/today")
    @Operation(summary = "Get today's attendance for current user")
    public ResponseEntity<AttendanceResponse> getToday(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(attendanceService.getTodayAttendance(userDetails.getUsername()));
    }

    @GetMapping("/history")
    @Operation(summary = "Get attendance history")
    public ResponseEntity<PagedResponse<AttendanceResponse>> getHistory(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        return ResponseEntity.ok(attendanceService.getAttendanceHistory(
                userDetails.getUsername(), PageRequest.of(page, size)));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER','PROJECT_MANAGER')")
    @Operation(summary = "Get attendance for a user by date range")
    public ResponseEntity<List<AttendanceResponse>> getUserAttendance(
            @PathVariable UUID userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(attendanceService.getAttendanceByDateRange(userId, start, end));
    }

    @GetMapping("/by-date")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER','PROJECT_MANAGER')")
    @Operation(summary = "Get all attendance for a date")
    public ResponseEntity<List<AttendanceResponse>> getAllByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(attendanceService.getAllAttendanceByDate(date));
    }

    @GetMapping("/percentage/{userId}")
    @Operation(summary = "Get attendance percentage for a user")
    public ResponseEntity<Map<String, Double>> getPercentage(
            @PathVariable UUID userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        double pct = attendanceService.getAttendancePercentage(userId, start, end);
        return ResponseEntity.ok(Map.of("percentage", pct));
    }
    // ── Working Schedule (Admin only) ─────────────────────────
    @GetMapping("/working-schedule")
    @Operation(summary = "Get current working schedule settings")
    public ResponseEntity<WorkingSchedule> getWorkingSchedule() {
        WorkingSchedule schedule = workingScheduleRepository.findAll()
            .stream().findFirst()
            .orElseGet(() -> WorkingSchedule.builder().build());
        return ResponseEntity.ok(schedule);
    }

    @PutMapping("/working-schedule")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR')")
    @Operation(summary = "Update working schedule (Admin only)")
    public ResponseEntity<WorkingSchedule> updateWorkingSchedule(
            @RequestBody WorkingSchedule schedule) {
        WorkingSchedule existing = workingScheduleRepository.findAll()
            .stream().findFirst().orElse(null);
        if (existing != null) {
            existing.setWorkingDays(schedule.getWorkingDays());
            existing.setWorkStartTime(schedule.getWorkStartTime());
            existing.setWorkEndTime(schedule.getWorkEndTime());
            existing.setWorkingHoursPerDay(schedule.getWorkingHoursPerDay());
            existing.setGraceMinutes(schedule.getGraceMinutes());
            return ResponseEntity.ok(workingScheduleRepository.save(existing));
        }
        return ResponseEntity.ok(workingScheduleRepository.save(schedule));
    }


    // ── Daily Attendance Report (who is present today) ────────────
    @GetMapping("/daily-report")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER','PROJECT_MANAGER')")
    @Operation(summary = "Get today's attendance report — who is present/absent")
    public ResponseEntity<Map<String, Object>> getDailyReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate reportDate = date != null ? date : LocalDate.now(ZoneId.of("Asia/Kolkata"));
        // Exclude SUPER_ADMIN from the attendance report — super admins are
        // system administrators, not employees whose presence/absence needs
        // to be tracked for HR purposes. Showing them leaks the account's
        // existence to anyone with HR-level report access.
        List<User> allUsers = userRepository.findByDeletedFalseAndActiveTrue()
            .stream()
            .filter(u -> u.getRole() == null || u.getRole() != com.syntaxcore.workforce.enums.Role.SUPER_ADMIN)
            .collect(java.util.stream.Collectors.toList());
        List<Attendance> attended = attendanceRepository.findByDate(reportDate);
        Set<UUID> presentIds = attended.stream().map(a -> a.getUser().getId()).collect(Collectors.toSet());

        List<Map<String, Object>> present = new ArrayList<>();
        List<Map<String, Object>> absent  = new ArrayList<>();

        for (User u : allUsers) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("userId",     u.getId().toString());
            row.put("fullName",   u.getFullName());
            row.put("role",       u.getRole() != null ? u.getRole().name() : "EMPLOYEE");
            row.put("department", u.getDepartment() != null ? u.getDepartment().getName() : null);

            if (presentIds.contains(u.getId())) {
                attended.stream().filter(a -> a.getUser().getId().equals(u.getId())).findFirst().ifPresent(a -> {
                    row.put("checkIn",    a.getCheckIn() != null ? a.getCheckIn().toLocalTime().toString() : null);
                    row.put("checkOut",   a.getCheckOut() != null ? a.getCheckOut().toLocalTime().toString() : null);
                    row.put("totalHours", a.getTotalHours());
                    row.put("isRemote",   a.isRemote());
                    row.put("status",     a.getStatus());
                    // Check-in location + photo
                    row.put("checkInLocation",  a.getCheckInLocation());
                    row.put("checkInLatitude",  a.getCheckInLatitude());
                    row.put("checkInLongitude", a.getCheckInLongitude());
                    row.put("checkInPhoto",     a.getCheckInPhoto());
                    // Check-out location + photo
                    row.put("checkOutLocation",  a.getCheckOutLocation());
                    row.put("checkOutLatitude",  a.getCheckOutLatitude());
                    row.put("checkOutLongitude", a.getCheckOutLongitude());
                    row.put("checkOutPhoto",     a.getCheckOutPhoto());
                });
                present.add(row);
            } else {
                row.put("status", "ABSENT");
                absent.add(row);
            }
        }

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("date",           reportDate.toString());
        report.put("totalEmployees", allUsers.size());
        report.put("presentCount",   present.size());
        report.put("absentCount",    absent.size());
        report.put("attendanceRate", allUsers.isEmpty() ? 0 : Math.round((present.size() * 100.0) / allUsers.size()));
        report.put("present",        present);
        report.put("absent",         absent);
        return ResponseEntity.ok(report);
    }


}
