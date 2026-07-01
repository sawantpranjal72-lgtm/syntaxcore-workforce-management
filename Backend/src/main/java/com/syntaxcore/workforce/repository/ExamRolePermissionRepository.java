package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.ExamRolePermission;
import com.syntaxcore.workforce.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamRolePermissionRepository extends JpaRepository<ExamRolePermission, java.util.UUID> {
    List<ExamRolePermission> findByDeletedFalse();
    Optional<ExamRolePermission> findByRoleAndDeletedFalse(Role role);
}
