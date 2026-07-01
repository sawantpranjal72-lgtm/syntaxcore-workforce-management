package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {

    Optional<UserSession> findBySessionTokenAndActiveTrue(String token);

    List<UserSession> findByUserIdAndActiveTrueOrderByLastActivityDesc(UUID userId);

    @Query("SELECT s FROM UserSession s WHERE " +
           "(:from IS NULL OR s.createdAt >= :from) AND " +
           "(:to   IS NULL OR s.createdAt <= :to) " +
           "ORDER BY s.createdAt DESC")
    org.springframework.data.domain.Page<UserSession> findByDateRange(
           @Param("from") LocalDateTime from,
           @Param("to")   LocalDateTime to,
           org.springframework.data.domain.Pageable pageable);

    @Modifying
    @Query("UPDATE UserSession s SET s.active = false, s.revokedAt = :now WHERE s.user.id = :userId AND s.active = true")
    void revokeAllForUser(@Param("userId") UUID userId, @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE UserSession s SET s.active = false, s.revokedAt = :now WHERE s.id = :id")
    void revokeById(@Param("id") UUID id, @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE UserSession s SET s.active = false, s.revokedAt = :now WHERE s.expiresAt < :now AND s.active = true")
    void expireOldSessions(@Param("now") LocalDateTime now);

    long countByUserIdAndActiveTrue(UUID userId);

    @Query("SELECT COUNT(s) FROM UserSession s WHERE s.active = true")
    long countAllActiveSessions();
}
