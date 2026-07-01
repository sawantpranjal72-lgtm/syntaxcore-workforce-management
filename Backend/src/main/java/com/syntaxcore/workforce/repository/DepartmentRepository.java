package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, UUID> {
    List<Department> findByDeletedFalse();
    Optional<Department> findByNameAndDeletedFalse(String name);
    boolean existsByName(String name);
}
