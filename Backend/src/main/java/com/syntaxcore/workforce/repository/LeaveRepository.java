package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.LeaveRequest;
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
public interface LeaveRepository extends JpaRepository<LeaveRequest, UUID> {

    Page<LeaveRequest> findByUserIdAndDeletedFalseOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("SELECT l FROM LeaveRequest l WHERE l.deleted = false " +
           "AND (:status IS NULL OR l.status = :status) " +
           "AND (:userId IS NULL OR l.user.id = :userId) " +
           "ORDER BY l.createdAt DESC")
    Page<LeaveRequest> findAllWithFilters(@Param("status") String status,
                                          @Param("userId") UUID userId,
                                          Pageable pageable);

    List<LeaveRequest> findByUserIdAndStatusAndDeletedFalse(UUID userId, String status);

    long countByStatusAndDeletedFalse(String status);

    Optional<LeaveRequest> findByEmailActionTokenAndDeletedFalse(String token);

    // Used by ReportController
    @Query("SELECT l FROM LeaveRequest l WHERE l.deleted = false AND l.startDate BETWEEN :from AND :to ORDER BY l.startDate DESC")
    List<LeaveRequest> findByStartDateBetweenAndDeletedFalse(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
