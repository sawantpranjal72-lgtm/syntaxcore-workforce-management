package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {
    Page<ActivityLog> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    Page<ActivityLog> findByTaskIdOrderByCreatedAtDesc(UUID taskId, Pageable pageable);
    Page<ActivityLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
