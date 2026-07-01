package com.syntaxcore.workforce.service.impl;

import com.syntaxcore.workforce.dto.response.AttendanceResponse;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import com.syntaxcore.workforce.entity.Attendance;
import com.syntaxcore.workforce.entity.User;
import com.syntaxcore.workforce.exception.BusinessException;
import com.syntaxcore.workforce.exception.ResourceNotFoundException;
import com.syntaxcore.workforce.repository.AttendanceRepository;
import com.syntaxcore.workforce.repository.UserRepository;
import com.syntaxcore.workforce.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AttendanceServiceImpl implements AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;

    @Override
    public AttendanceResponse checkIn(String userEmail, String location, boolean remote,
                                       Double latitude, Double longitude, String photo) {
        User user = findUserByEmail(userEmail);
        LocalDate today = LocalDate.now();

        attendanceRepository.findByUserIdAndDate(user.getId(), today).ifPresent(a -> {
            if (a.getCheckIn() != null) {
                throw new BusinessException("Already checked in today at " + a.getCheckIn());
            }
        });

        Attendance attendance = Attendance.builder()
            .user(user)
            .date(today)
            .checkIn(LocalDateTime.now())
            .status("PRESENT")
            .location(location)
            .remote(remote)
            .checkInLatitude(latitude)
            .checkInLongitude(longitude)
            .checkInLocation(location)
            .checkInPhoto(photo)
            .build();

        return toResponse(attendanceRepository.save(attendance));
    }

    @Override
    public AttendanceResponse checkOut(String userEmail, String location,
                                        Double latitude, Double longitude, String photo) {
        User user = findUserByEmail(userEmail);
        LocalDate today = LocalDate.now();

        Attendance attendance = attendanceRepository.findByUserIdAndDate(user.getId(), today)
            .orElseThrow(() -> new BusinessException("No check-in found for today"));

        if (attendance.getCheckOut() != null) {
            throw new BusinessException("Already checked out today");
        }

        attendance.setCheckOut(LocalDateTime.now());
        double hours = Duration.between(attendance.getCheckIn(), attendance.getCheckOut()).toMinutes() / 60.0;
        attendance.setTotalHours(Math.round(hours * 100.0) / 100.0);
        attendance.setCheckOutLatitude(latitude);
        attendance.setCheckOutLongitude(longitude);
        if (location != null) attendance.setCheckOutLocation(location);
        attendance.setCheckOutPhoto(photo);

        return toResponse(attendanceRepository.save(attendance));
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceResponse getTodayAttendance(String userEmail) {
        User user = findUserByEmail(userEmail);
        return attendanceRepository.findByUserIdAndDate(user.getId(), LocalDate.now())
            .map(this::toResponse)
            .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<AttendanceResponse> getAttendanceHistory(String userEmail, Pageable pageable) {
        User user = findUserByEmail(userEmail);
        Page<Attendance> page = attendanceRepository.findByUserIdOrderByDateDesc(user.getId(), pageable);
        return PagedResponse.from(page.map(this::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceResponse> getAttendanceByDateRange(UUID userId, LocalDate start, LocalDate end) {
        return attendanceRepository.findByUserIdAndDateBetween(userId, start, end)
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceResponse> getAllAttendanceByDate(LocalDate date) {
        return attendanceRepository.findByDateRange(date, date)
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public double getAttendancePercentage(UUID userId, LocalDate start, LocalDate end) {
        long totalDays = start.until(end).getDays() + 1;
        long presentDays = attendanceRepository.countPresentDays(userId, start, end);
        return totalDays > 0 ? (double) presentDays / totalDays * 100 : 0;
    }

    private AttendanceResponse toResponse(Attendance a) {
        return AttendanceResponse.builder()
            .id(a.getId())
            .userId(a.getUser().getId())
            .userName(a.getUser().getFullName())
            .userAvatar(a.getUser().getAvatarUrl())
            .date(a.getDate())
            .checkIn(a.getCheckIn())
            .checkOut(a.getCheckOut())
            .totalHours(a.getTotalHours())
            .status(a.getStatus())
            .notes(a.getNotes())
            .location(a.getLocation())
            .remote(a.isRemote())
            .checkInLatitude(a.getCheckInLatitude())
            .checkInLongitude(a.getCheckInLongitude())
            .checkInLocation(a.getCheckInLocation())
            .checkInPhoto(a.getCheckInPhoto())
            .checkOutLatitude(a.getCheckOutLatitude())
            .checkOutLongitude(a.getCheckOutLongitude())
            .checkOutLocation(a.getCheckOutLocation())
            .checkOutPhoto(a.getCheckOutPhoto())
            .build();
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmailIgnoreCaseAndDeletedFalse(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", email));
    }
}
