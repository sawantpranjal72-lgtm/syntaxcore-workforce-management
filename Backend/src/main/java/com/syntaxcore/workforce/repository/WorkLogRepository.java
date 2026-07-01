package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.WorkLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface WorkLogRepository extends JpaRepository<WorkLog, UUID> {

    List<WorkLog> findByUserIdAndDateBetween(UUID userId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COALESCE(SUM(w.hoursWorked), 0) FROM WorkLog w WHERE w.user.id = :userId AND w.date BETWEEN :startDate AND :endDate")
    Double sumHoursByUserAndDateRange(@Param("userId") UUID userId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
