package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.Task;
import com.syntaxcore.workforce.enums.Priority;
import com.syntaxcore.workforce.enums.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {

    @Query(value = "SELECT DISTINCT t FROM Task t LEFT JOIN t.assignees a WHERE t.deleted = false " +
           "AND (:projectId IS NULL OR t.project.id = :projectId) " +
           "AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId OR a.id = :assigneeId) " +
           "AND (:status IS NULL OR t.status = :status) " +
           "AND (:priority IS NULL OR t.priority = :priority) " +
           "AND LOWER(t.title) LIKE CONCAT('%', :search, '%')",
           countQuery = "SELECT COUNT(DISTINCT t) FROM Task t LEFT JOIN t.assignees a WHERE t.deleted = false " +
           "AND (:projectId IS NULL OR t.project.id = :projectId) " +
           "AND (:assigneeId IS NULL OR t.assignee.id = :assigneeId OR a.id = :assigneeId) " +
           "AND (:status IS NULL OR t.status = :status) " +
           "AND (:priority IS NULL OR t.priority = :priority) " +
           "AND LOWER(t.title) LIKE CONCAT('%', :search, '%')")
    Page<Task> findAllWithFilters(@Param("projectId") UUID projectId,
                                   @Param("assigneeId") UUID assigneeId,
                                   @Param("status") TaskStatus status,
                                   @Param("priority") Priority priority,
                                   @Param("search") String search,
                                   Pageable pageable);

    List<Task> findByProjectIdAndDeletedFalse(UUID projectId);
    List<Task> findByStatusAndDeletedFalse(TaskStatus status);

    List<Task> findBySprintIdAndDeletedFalse(UUID sprintId);

    @Query("SELECT DISTINCT t FROM Task t LEFT JOIN t.assignees a WHERE t.deleted = false " +
           "AND (t.assignee.id = :userId OR a.id = :userId) AND t.status != 'COMPLETED'")
    List<Task> findActiveTasksByAssignee(@Param("userId") UUID userId);

    @Query("SELECT t FROM Task t WHERE t.deleted = false AND t.deadline < :now AND t.status NOT IN ('COMPLETED', 'CANCELLED')")
    List<Task> findOverdueTasks(@Param("now") LocalDateTime now);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.deleted = false AND t.status = :status")
    long countByStatus(@Param("status") TaskStatus status);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.deleted = false AND t.assignee.id = :userId AND t.status = :status")
    long countByAssigneeAndStatus(@Param("userId") UUID userId, @Param("status") TaskStatus status);

    List<Task> findByParentTaskIdAndDeletedFalse(UUID parentTaskId);

    @Query("SELECT t FROM Task t WHERE t.deleted = false AND t.project.id = :projectId ORDER BY t.boardOrder ASC")
    List<Task> findByProjectOrderedForKanban(@Param("projectId") UUID projectId);

    // ── Report-specific queries ───────────────────────────────

    @Query("SELECT COUNT(t) FROM Task t WHERE t.deleted = false AND t.assignee.id = :userId")
    long countByAssigneeIdAndDeletedFalse(@Param("userId") UUID userId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.deleted = false AND t.assignee.id = :userId AND t.status = :status")
    long countByAssigneeIdAndStatusAndDeletedFalse(@Param("userId") UUID userId, @Param("status") TaskStatus status);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.deleted = false AND t.assignee.id = :userId AND t.deadline < CURRENT_TIMESTAMP AND t.status NOT IN ('COMPLETED','CANCELLED')")
    long countOverdueByAssigneeId(@Param("userId") UUID userId);
}
