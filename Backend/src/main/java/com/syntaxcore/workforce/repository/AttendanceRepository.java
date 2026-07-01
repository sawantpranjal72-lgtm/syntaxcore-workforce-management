package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.Attendance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {

    Optional<Attendance> findByUserIdAndDate(UUID userId, LocalDate date);

    List<Attendance> findByDate(LocalDate date);

    List<Attendance> findByUserIdAndDateBetween(UUID userId, LocalDate startDate, LocalDate endDate);

    Page<Attendance> findByUserIdOrderByDateDesc(UUID userId, Pageable pageable);

    @Query("SELECT a FROM Attendance a WHERE a.date BETWEEN :startDate AND :endDate ORDER BY a.date DESC")
    List<Attendance> findByDateRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    // Used by ReportController
    @Query("SELECT a FROM Attendance a WHERE a.date BETWEEN :startDate AND :endDate ORDER BY a.date DESC, a.user.lastName ASC")
    List<Attendance> findByDateBetweenOrderByDateDesc(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    // Used by MetricsController
    @Query("SELECT a FROM Attendance a WHERE a.user.id = :userId AND a.date BETWEEN :startDate AND :endDate ORDER BY a.date DESC")
    List<Attendance> findByUserIdAndDateBetweenOrderByDateDesc(@Param("userId") UUID userId,
                                                               @Param("startDate") LocalDate startDate,
                                                               @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.user.id = :userId AND a.date BETWEEN :startDate AND :endDate AND a.status = 'PRESENT'")
    long countPresentDays(@Param("userId") UUID userId,
                          @Param("startDate") LocalDate startDate,
                          @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.date = :date")
    long countByDate(@Param("date") LocalDate date);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.date = :date AND (a.status = 'PRESENT' OR a.status = 'LATE')")
    long countCheckInsForDate(@Param("date") LocalDate date);
}
