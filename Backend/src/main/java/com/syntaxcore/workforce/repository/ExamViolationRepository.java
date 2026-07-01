package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.ExamViolation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface ExamViolationRepository extends JpaRepository<ExamViolation, UUID> {
}
