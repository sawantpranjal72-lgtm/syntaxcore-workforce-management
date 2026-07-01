package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.Sprint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface SprintRepository extends JpaRepository<Sprint, UUID> {
    List<Sprint> findByProjectIdAndDeletedFalse(UUID projectId);
    List<Sprint> findByProjectIdAndActiveTrueAndDeletedFalse(UUID projectId);
}
