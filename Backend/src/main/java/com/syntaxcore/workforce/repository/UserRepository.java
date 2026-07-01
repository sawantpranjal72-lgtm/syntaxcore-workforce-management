package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.User;
import com.syntaxcore.workforce.enums.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailAndDeletedFalse(String email);
    Optional<User> findByEmailIgnoreCaseAndDeletedFalse(String email);
    Optional<User> findByPhoneAndDeletedFalse(String phone);
    Optional<User> findByEmailVerificationToken(String token);
    Optional<User> findByPasswordResetToken(String token);
    boolean existsByEmailAndDeletedFalse(String email);
    boolean existsByEmailIgnoreCaseAndDeletedFalse(String email);

    @Query("SELECT u FROM User u WHERE u.deleted = false ORDER BY u.createdAt DESC")
    List<User> findByDeletedFalseOrderByCreatedAtDesc();

    @Query("SELECT u FROM User u WHERE u.deleted = false AND u.active = true ORDER BY u.firstName ASC")
    List<User> findByDeletedFalseAndActiveTrue();

    @Query("SELECT COUNT(u) FROM User u WHERE u.deleted = false AND u.active = true")
    long countActiveUsers();

    @Query("SELECT u FROM User u WHERE u.deleted = false AND u.active = true AND u.role <> com.syntaxcore.workforce.enums.Role.SUPER_ADMIN " +
           "AND (:search IS NULL OR :search = '' OR LOWER(u.firstName) LIKE LOWER(CONCAT('%',:search,'%')) " +
           "     OR LOWER(u.lastName) LIKE LOWER(CONCAT('%',:search,'%')) " +
           "     OR LOWER(u.email) LIKE LOWER(CONCAT('%',:search,'%')) " +
           "     OR LOWER(u.employeeId) LIKE LOWER(CONCAT('%',:search,'%'))) " +
           "AND (:role IS NULL OR u.role = :role) " +
           "AND (:departmentId IS NULL OR u.department.id = :departmentId)")
    Page<User> findAllWithFilters(@Param("search") String search,
                                   @Param("role") Role role,
                                   @Param("departmentId") UUID departmentId,
                                   Pageable pageable);

    List<User> findByDepartmentIdAndDeletedFalse(UUID departmentId);

    @Query("SELECT u FROM User u WHERE u.deleted = false AND u.active = true " +
           "AND u.role NOT IN (com.syntaxcore.workforce.enums.Role.SUPER_ADMIN) " +
           "ORDER BY u.firstName ASC")
    List<User> findAssignableUsers();
    List<User> findByRoleAndDeletedFalse(Role role);

    @Query("SELECT u FROM User u WHERE u.deleted = false AND u.active = true " +
           "AND u.role <> com.syntaxcore.workforce.enums.Role.SUPER_ADMIN " +
           "AND (:departmentId IS NULL OR u.department.id = :departmentId) " +
           "ORDER BY u.firstName ASC")
    List<User> findActiveUsers(@Param("departmentId") UUID departmentId);
}
