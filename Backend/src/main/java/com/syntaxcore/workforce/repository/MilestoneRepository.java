package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.Milestone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MilestoneRepository extends JpaRepository<Milestone, UUID> {
    List<Milestone> findByProjectIdAndDeletedFalse(UUID projectId);
    List<Milestone> findByProjectIdAndCompletedFalseAndDeletedFalse(UUID projectId);
}
