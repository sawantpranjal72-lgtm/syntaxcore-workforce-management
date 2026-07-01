package com.syntaxcore.workforce.controller;

import com.syntaxcore.workforce.dto.request.TaskRequest;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import com.syntaxcore.workforce.dto.response.TaskResponse;
import com.syntaxcore.workforce.enums.Priority;
import com.syntaxcore.workforce.enums.TaskStatus;
import com.syntaxcore.workforce.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
@Tag(name = "Task Management", description = "Task CRUD, Kanban, and status management")
public class TaskController {

    private final TaskService taskService;

    @PostMapping
    @Operation(summary = "Create a new task")
    public ResponseEntity<TaskResponse> createTask(
            @Valid @RequestBody TaskRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taskService.createTask(request, userDetails.getUsername()));
    }

    @GetMapping
    @Operation(summary = "Get all tasks with filters")
    public ResponseEntity<PagedResponse<TaskResponse>> getAllTasks(
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) UUID assigneeId,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        return ResponseEntity.ok(taskService.getAllTasks(projectId, assigneeId, status, priority, search,
                PageRequest.of(page, size, sort)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get task by ID")
    public ResponseEntity<TaskResponse> getTask(@PathVariable UUID id) {
        return ResponseEntity.ok(taskService.getTask(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update task")
    public ResponseEntity<TaskResponse> updateTask(
            @PathVariable UUID id,
            @RequestBody TaskRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(taskService.updateTask(id, request, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER','PROJECT_MANAGER')")
    @Operation(summary = "Delete task (soft)")
    public ResponseEntity<Void> deleteTask(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        taskService.deleteTask(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update task status")
    public ResponseEntity<TaskResponse> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String statusStr = body.get("status");
        if (statusStr == null || statusStr.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        TaskStatus status;
        try {
            status = TaskStatus.valueOf(statusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(taskService.updateTaskStatus(id, status, userDetails.getUsername()));
    }

    @PatchMapping("/{id}/start")
    @Operation(summary = "Mark that the current user has started their own portion of this task — tracked per-assignee on multi-assignee tasks, so it doesn't affect other assignees' displayed status")
    public ResponseEntity<TaskResponse> startWork(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(taskService.startWork(id, userDetails.getUsername()));
    }

    @GetMapping("/kanban")
    @Operation(summary = "Get Kanban board for a project")
    public ResponseEntity<List<TaskResponse>> getKanban(@RequestParam UUID projectId) {
        return ResponseEntity.ok(taskService.getKanbanBoard(projectId));
    }

    @PatchMapping("/{id}/board-order")
    @Operation(summary = "Update task Kanban column and order (drag-drop)")
    public ResponseEntity<Void> updateBoardOrder(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body) {
        taskService.updateBoardOrder(id, (String) body.get("boardColumn"),
                (Integer) body.get("boardOrder"));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/my-tasks")
    @Operation(summary = "Get tasks assigned to current user")
    public ResponseEntity<List<TaskResponse>> getMyTasks(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(taskService.getMyTasks(userDetails.getUsername()));
    }

    @GetMapping("/overdue")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER','PROJECT_MANAGER')")
    @Operation(summary = "Get all overdue tasks")
    public ResponseEntity<List<TaskResponse>> getOverdueTasks() {
        return ResponseEntity.ok(taskService.getOverdueTasks());
    }
    @GetMapping("/{id}/user-statuses")
    @Operation(summary = "Get per-user task completion status")
    public ResponseEntity<List<Map<String, Object>>> getUserStatuses(@PathVariable UUID id) {
        return ResponseEntity.ok(taskService.getTaskUserStatuses(id));
    }

    @PostMapping("/{id}/submit")
    @Operation(summary = "Submit task work for review")
    public ResponseEntity<Map<String, String>> submitTask(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        taskService.submitTask(id,
            body.get("description"),
            body.get("submissionFileUrl"),
            body.get("githubLink"),
            body.get("liveDemoLink"),
            userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "Task submitted for review"));
    }

    @PatchMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER','PROJECT_MANAGER')")
    @Operation(summary = "Approve or reject the task's most recent pending submission (legacy — prefer /submissions/{submissionId}/review)")
    public ResponseEntity<TaskResponse> reviewTask(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean approved = "APPROVED".equalsIgnoreCase(body.get("decision"));
        return ResponseEntity.ok(taskService.reviewTask(id, approved, body.get("feedback"), userDetails.getUsername()));
    }

    @PatchMapping("/{id}/submissions/{submissionId}/review")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER','PROJECT_MANAGER')")
    @Operation(summary = "Approve or reject one specific assignee's submission, independent of any other assignee on the same task")
    public ResponseEntity<TaskResponse> reviewSubmission(
            @PathVariable UUID id,
            @PathVariable UUID submissionId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean approved = "APPROVED".equalsIgnoreCase(body.get("decision"));
        return ResponseEntity.ok(taskService.reviewSubmission(id, submissionId, approved, body.get("feedback"), userDetails.getUsername()));
    }

    @GetMapping("/submissions/pending")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','PROJECT_MANAGER','HR_MANAGER')")
    @Operation(summary = "Get all pending task submissions for review")
    public ResponseEntity<List<Map<String, Object>>> getPendingSubmissions(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(taskService.getPendingSubmissions(userDetails.getUsername()));
    }


}
