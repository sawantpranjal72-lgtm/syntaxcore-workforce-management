package com.syntaxcore.workforce.service;

import com.syntaxcore.workforce.dto.request.TaskRequest;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import com.syntaxcore.workforce.dto.response.TaskResponse;
import com.syntaxcore.workforce.enums.Priority;
import com.syntaxcore.workforce.enums.TaskStatus;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface TaskService {
    TaskResponse createTask(TaskRequest request, String creatorEmail);
    TaskResponse updateTask(UUID id, TaskRequest request, String updaterEmail);
    TaskResponse getTask(UUID id);
    PagedResponse<TaskResponse> getAllTasks(UUID projectId, UUID assigneeId, TaskStatus status, Priority priority, String search, Pageable pageable);
    void deleteTask(UUID id, String deleterEmail);
    TaskResponse updateTaskStatus(UUID id, TaskStatus status, String updaterEmail);
    List<TaskResponse> getKanbanBoard(UUID projectId);
    void updateBoardOrder(UUID id, String boardColumn, Integer boardOrder);
    List<TaskResponse> getMyTasks(String userEmail);
    List<TaskResponse> getOverdueTasks();
    List<Map<String, Object>> getTaskUserStatuses(UUID taskId);
    TaskResponse startWork(UUID taskId, String userEmail);
    void submitTask(UUID taskId, String description, String fileUrl, String githubLink, String liveDemoLink, String userEmail);
    TaskResponse reviewTask(UUID taskId, boolean approved, String feedback, String reviewerEmail);
    TaskResponse reviewSubmission(UUID taskId, UUID submissionId, boolean approved, String feedback, String reviewerEmail);
    List<Map<String, Object>> getPendingSubmissions(String reviewerEmail);
}
