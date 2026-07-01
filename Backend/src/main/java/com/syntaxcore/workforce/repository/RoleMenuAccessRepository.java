package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.RoleMenuAccess;
import com.syntaxcore.workforce.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RoleMenuAccessRepository extends JpaRepository<RoleMenuAccess, UUID> {
    List<RoleMenuAccess> findByDeletedFalse();
    List<RoleMenuAccess> findByRoleAndDeletedFalse(Role role);
}
