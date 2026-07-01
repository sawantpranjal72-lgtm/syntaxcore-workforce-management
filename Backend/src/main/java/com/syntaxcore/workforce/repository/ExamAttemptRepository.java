package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.ExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, UUID> {
    Optional<ExamAttempt> findByExamIdAndUserId(UUID examId, UUID userId);
    List<ExamAttempt> findByExamIdOrderBySubmittedAtDesc(UUID examId);
    List<ExamAttempt> findByUserId(UUID userId);
}
