package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.Project;
import com.syntaxcore.workforce.enums.ProjectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID> {

    @Query("SELECT p FROM Project p WHERE p.deleted = false " +
           "AND (:status IS NULL OR p.status = :status) " +
           "AND (:managerId IS NULL OR p.manager.id = :managerId) " +
           "AND LOWER(p.name) LIKE CONCAT('%', :search, '%')")
    Page<Project> findAllWithFilters(@Param("status") ProjectStatus status,
                                      @Param("managerId") UUID managerId,
                                      @Param("search") String search,
                                      Pageable pageable);

    @Query("SELECT p FROM Project p JOIN p.members m WHERE p.deleted = false AND m.id = :userId")
    List<Project> findProjectsByMember(@Param("userId") UUID userId);

    long countByStatusAndDeletedFalse(ProjectStatus status);
}
