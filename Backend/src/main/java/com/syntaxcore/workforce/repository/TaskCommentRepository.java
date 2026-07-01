package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.TaskComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskCommentRepository extends JpaRepository<TaskComment, UUID> {
    List<TaskComment> findByTaskIdAndDeletedFalseOrderByCreatedAtAsc(UUID taskId);
    List<TaskComment> findByTaskIdAndParentCommentIsNullAndDeletedFalseOrderByCreatedAtAsc(UUID taskId);
}
