package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.Exam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ExamRepository extends JpaRepository<Exam, UUID> {
    List<Exam> findByDeletedFalseOrderByCreatedAtDesc();
    List<Exam> findByStatusAndDeletedFalse(String status);
}
