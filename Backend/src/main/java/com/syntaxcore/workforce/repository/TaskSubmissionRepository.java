package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.TaskSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TaskSubmissionRepository extends JpaRepository<TaskSubmission, UUID> {
    List<TaskSubmission> findByTaskIdAndDeletedFalseOrderByCreatedAtDesc(UUID taskId);
    Optional<TaskSubmission> findTopByTaskIdAndSubmittedByIdAndDeletedFalseOrderByCreatedAtDesc(UUID taskId, UUID userId);
    List<TaskSubmission> findByStatusAndDeletedFalse(String status);
}
