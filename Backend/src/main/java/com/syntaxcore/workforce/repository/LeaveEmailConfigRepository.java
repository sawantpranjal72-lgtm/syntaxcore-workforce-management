package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.LeaveEmailConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface LeaveEmailConfigRepository extends JpaRepository<LeaveEmailConfig, UUID> {
    List<LeaveEmailConfig> findByActiveTrueAndDeletedFalse();
    List<LeaveEmailConfig> findByDeletedFalse();
    boolean existsByEmailAndActiveTrueAndDeletedFalse(String email);
}
