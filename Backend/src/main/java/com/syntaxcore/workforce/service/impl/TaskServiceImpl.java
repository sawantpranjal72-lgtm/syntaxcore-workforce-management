package com.syntaxcore.workforce.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.syntaxcore.workforce.dto.request.TaskRequest;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import com.syntaxcore.workforce.dto.response.TaskResponse;
import com.syntaxcore.workforce.dto.response.UserSummaryResponse;
import com.syntaxcore.workforce.entity.*;
import com.syntaxcore.workforce.enums.NotificationType;
import com.syntaxcore.workforce.enums.Priority;
import com.syntaxcore.workforce.enums.TaskStatus;
import com.syntaxcore.workforce.exception.ResourceNotFoundException;
import com.syntaxcore.workforce.repository.*;
import com.syntaxcore.workforce.entity.TaskSubmission;
import com.syntaxcore.workforce.service.NotificationService;
import com.syntaxcore.workforce.service.TaskService;
import com.syntaxcore.workforce.util.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.HashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;
    private final TaskSubmissionRepository taskSubmissionRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final SprintRepository sprintRepository;
    private final ActivityLogRepository activityLogRepository;
    private final NotificationService notificationService;
    private final UserMapper userMapper;
    private final ObjectMapper objectMapper;

    @Override
    public TaskResponse createTask(TaskRequest request, String creatorEmail) {
        User creator = findUserByEmail(creatorEmail);

        Task task = new Task();
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setStatus(request.getStatus() != null ? request.getStatus() : TaskStatus.PENDING);
        task.setPriority(request.getPriority() != null ? request.getPriority() : Priority.MEDIUM);
        task.setDeadline(request.getDeadline());
        task.setEstimatedHours(request.getEstimatedHours());
        task.setStoryPoints(request.getStoryPoints());
        task.setRecurring(request.isRecurring());
        task.setRecurrencePattern(request.getRecurrencePattern());
        task.setBoardColumn(request.getBoardColumn() != null ? request.getBoardColumn() : "PENDING");
        task.setBoardOrder(request.getBoardOrder() != null ? request.getBoardOrder() : 0);
        task.setReporter(creator);

        // Labels and Tags
        if (request.getLabels() != null) {
            try { task.setLabels(objectMapper.writeValueAsString(request.getLabels())); } catch (Exception ignored) {}
        }
        if (request.getTags() != null) {
            try { task.setTags(objectMapper.writeValueAsString(request.getTags())); } catch (Exception ignored) {}
        }
        task.setChecklist(request.getChecklist());

        // Set project
        if (request.getProjectId() != null) {
            task.setProject(projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project", request.getProjectId().toString())));
        }

        // Set sprint
        if (request.getSprintId() != null) {
            task.setSprint(sprintRepository.findById(request.getSprintId()).orElse(null));
        }

        // Primary assignee — with role-based restriction
        if (request.getAssigneeId() != null) {
            User assignee = userRepository.findById(request.getAssigneeId()).orElse(null);
            if (assignee != null) {
                validateAssigneeRole(creator, assignee);
                task.setAssignee(assignee);
            }
        }

        // Multiple assignees — enforce same role restriction
        if (request.getAssigneeIds() != null && !request.getAssigneeIds().isEmpty()) {
            Set<User> assignees = new HashSet<>(userRepository.findAllById(request.getAssigneeIds()));
            for (User a : assignees) {
                validateAssigneeRole(creator, a);
            }
            task.setAssignees(assignees);
            // Also set primary assignee to the first one if not already set
            if (task.getAssignee() == null && !assignees.isEmpty()) {
                task.setAssignee(assignees.iterator().next());
            }
        }

        // Parent task
        if (request.getParentTaskId() != null) {
            task.setParentTask(taskRepository.findById(request.getParentTaskId()).orElse(null));
        }

        Task saved = taskRepository.save(task);

        // Log activity
        logActivity(creator, saved, "TASK_CREATED", "Task created: " + saved.getTitle());

        // Send notifications to assignees — every assignee in a multi-assignee
        // task must be notified, not just whichever one happens to be the
        // primary FK (previously only saved.getAssignee() was notified, so on
        // a multi-assignee task most assignees never received anything).
        Set<User> notifyTargets = new HashSet<>();
        if (saved.getAssignee() != null) notifyTargets.add(saved.getAssignee());
        if (saved.getAssignees() != null) notifyTargets.addAll(saved.getAssignees());

        for (User target : notifyTargets) {
            notificationService.sendNotification(
                target,
                creator,
                NotificationType.TASK_ASSIGNED,
                "Task Assigned",
                "You've been assigned: " + saved.getTitle(),
                "TASK",
                saved.getId()
            );
        }

        return toResponse(saved);
    }

    @Override
    public TaskResponse updateTask(UUID id, TaskRequest request, String updaterEmail) {
        User updater = findUserByEmail(updaterEmail);
        Task task = findTaskById(id);

        String oldStatus = task.getStatus().name();

        if (request.getTitle() != null) task.setTitle(request.getTitle());
        if (request.getDescription() != null) task.setDescription(request.getDescription());
        if (request.getStatus() != null) {
            task.setStatus(request.getStatus());
            if (request.getStatus() == TaskStatus.COMPLETED) {
                task.setCompletedAt(LocalDateTime.now());
            }
        }
        if (request.getPriority() != null) task.setPriority(request.getPriority());
        if (request.getDeadline() != null) task.setDeadline(request.getDeadline());
        if (request.getEstimatedHours() != null) task.setEstimatedHours(request.getEstimatedHours());
        if (request.getStoryPoints() != null) task.setStoryPoints(request.getStoryPoints());
        if (request.getChecklist() != null) task.setChecklist(request.getChecklist());

        // Primary assignee (singular field). When the request also includes
        // assigneeIds — which the frontend always does, with assigneeIds[0]
        // mirroring this field — skip the notification here and let the
        // assigneeIds block below handle it once, to avoid double-notifying
        // the same person for a single reassignment.
        if (request.getAssigneeId() != null && request.getAssigneeIds() == null) {
            User newAssignee = userRepository.findById(request.getAssigneeId()).orElse(null);
            if (newAssignee != null && !newAssignee.equals(task.getAssignee())) {
                task.setAssignee(newAssignee);
                notificationService.sendNotification(
                    newAssignee, updater, NotificationType.TASK_ASSIGNED,
                    "Task Assigned", "You've been assigned: " + task.getTitle(), "TASK", task.getId()
                );
            }
        } else if (request.getAssigneeId() != null) {
            User newAssignee = userRepository.findById(request.getAssigneeId()).orElse(null);
            if (newAssignee != null) task.setAssignee(newAssignee);
        }

        // Multiple assignees — recompute the full set and notify anyone newly
        // added. Previously this field was accepted by the request DTO but
        // completely ignored here, so editing a task's assignee list had no
        // effect at all.
        if (request.getAssigneeIds() != null) {
            Set<User> newAssignees = request.getAssigneeIds().isEmpty()
                ? new HashSet<>()
                : new HashSet<>(userRepository.findAllById(request.getAssigneeIds()));

            for (User a : newAssignees) {
                validateAssigneeRole(updater, a);
            }

            Set<User> previousAssignees = new HashSet<>(task.getAssignees());
            Set<User> addedAssignees = new HashSet<>(newAssignees);
            addedAssignees.removeAll(previousAssignees);

            task.setAssignees(newAssignees);

            // Keep the primary assignee in sync: if it was removed from the
            // set, or was never set, fall back to the first remaining assignee.
            if (!newAssignees.isEmpty() && (task.getAssignee() == null || !newAssignees.contains(task.getAssignee()))) {
                task.setAssignee(newAssignees.iterator().next());
            } else if (newAssignees.isEmpty()) {
                task.setAssignee(null);
            }

            for (User added : addedAssignees) {
                notificationService.sendNotification(
                    added, updater, NotificationType.TASK_ASSIGNED,
                    "Task Assigned", "You've been assigned: " + task.getTitle(), "TASK", task.getId()
                );
            }
        }

        Task saved = taskRepository.save(task);
        logActivity(updater, saved, "TASK_UPDATED", 
            String.format("Task updated. Status: %s -> %s", oldStatus, saved.getStatus().name()));

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public TaskResponse getTask(UUID id) {
        return toResponse(findTaskById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<TaskResponse> getAllTasks(UUID projectId, UUID assigneeId, TaskStatus status,
                                                    Priority priority, String search, Pageable pageable) {
        Page<Task> tasks = taskRepository.findAllWithFilters(
            projectId, assigneeId, status, priority, normalizeSearch(search), pageable);
        Page<TaskResponse> responsePage = tasks.map(this::toResponse);
        return PagedResponse.from(responsePage);
    }

    @Override
    public void deleteTask(UUID id, String deleterEmail) {
        Task task = findTaskById(id);
        task.setDeleted(true);
        task.setDeletedAt(LocalDateTime.now());
        taskRepository.save(task);
        log.info("Task {} soft-deleted by {}", id, deleterEmail);
    }

    @Override
    public TaskResponse updateTaskStatus(UUID id, TaskStatus status, String updaterEmail) {
        User updater = findUserByEmail(updaterEmail);
        Task task = findTaskById(id);
        TaskStatus oldStatus = task.getStatus();

        // On multi-assignee tasks, the shared status must ONLY be derived
        // from the full set of assignees' actions via computeOverallStatus().
        // Direct mutations — even innocent ones like PENDING→IN_PROGRESS —
        // would affect every assignee's displayed state simultaneously, which
        // is exactly the problem this per-assignee architecture is designed to
        // prevent. Direct callers should use startWork() or submitTask()
        // instead; reviewSubmission() already calls computeOverallStatus().
        boolean isMultiAssignee = task.getAssignees() != null && task.getAssignees().size() > 1;
        if (isMultiAssignee) {
            // Silently no-op rather than error — callers may not know whether
            // the task has multiple assignees, and failing visibly would be
            // confusing in the UI.
            return toResponse(task);
        }

        task.setStatus(status);
        if (status == TaskStatus.COMPLETED) task.setCompletedAt(LocalDateTime.now());
        Task saved = taskRepository.save(task);
        logActivity(updater, saved, "STATUS_CHANGED", oldStatus.name() + " -> " + status.name());
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TaskResponse> getKanbanBoard(UUID projectId) {
        return taskRepository.findByProjectOrderedForKanban(projectId)
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public void updateBoardOrder(UUID id, String boardColumn, Integer boardOrder) {
        Task task = findTaskById(id);
        task.setBoardColumn(boardColumn);
        task.setBoardOrder(boardOrder);
        taskRepository.save(task);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TaskResponse> getMyTasks(String userEmail) {
        User user = findUserByEmail(userEmail);
        return taskRepository.findActiveTasksByAssignee(user.getId())
            .stream().map(task -> toResponse(task, user)).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TaskResponse> getOverdueTasks() {
        return taskRepository.findOverdueTasks(LocalDateTime.now())
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    private TaskResponse toResponse(Task task) {
        return toResponse(task, null);
    }

    /**
     * Builds the response with an optional "viewer" perspective. When a viewer is
     * supplied, myStatus/mySubmissionStatus/myReviewFeedback reflect that specific
     * person's own latest submission on this task — distinct from the task's
     * shared/overall status, which previously was (incorrectly) the only status
     * exposed and was identical for every assignee regardless of who had
     * actually submitted or been reviewed.
     */
    private TaskResponse toResponse(Task task, User viewer) {
        List<String> labels = parseJsonList(task.getLabels());
        List<String> tags = parseJsonList(task.getTags());

        List<UserSummaryResponse> assignees = task.getAssignees().stream()
            .map(userMapper::toSummaryResponse).collect(Collectors.toList());

        List<TaskResponse> subtasks = task.getSubtasks().stream()
            .filter(s -> !s.isDeleted()).map(this::toResponseSimple).collect(Collectors.toList());

        long completedSubtasks = task.getSubtasks().stream()
            .filter(s -> !s.isDeleted() && s.getStatus() == TaskStatus.COMPLETED).count();

        String myStatus = null;
        String mySubmissionStatus = null;
        String myReviewFeedback = null;
        if (viewer != null) {
            TaskSubmission myLatest = task.getSubmissions().stream()
                .filter(s -> s.getSubmittedBy() != null && s.getSubmittedBy().getId().equals(viewer.getId()))
                .max(java.util.Comparator.comparing(TaskSubmission::getCreatedAt,
                    java.util.Comparator.nullsFirst(java.util.Comparator.naturalOrder())))
                .orElse(null);

            boolean viewerIsAssignee = (task.getAssignee() != null && task.getAssignee().getId().equals(viewer.getId()))
                || (task.getAssignees() != null && task.getAssignees().stream().anyMatch(a -> a.getId().equals(viewer.getId())));

            if (myLatest != null) {
                mySubmissionStatus = myLatest.getStatus();
                myReviewFeedback = myLatest.getReviewFeedback();
                myStatus = switch (myLatest.getStatus()) {
                    case "PENDING"  -> "UNDER_REVIEW";
                    case "APPROVED" -> "COMPLETED";
                    case "REJECTED" -> "REJECTED";
                    default -> task.getStatus().name();
                };
            } else if (viewerIsAssignee) {
                boolean isMultiAssignee = task.getAssignees() != null && task.getAssignees().size() > 1;
                if (!isMultiAssignee) {
                    // Single-assignee task: the shared status is unambiguous
                    // and always belongs to this one person.
                    myStatus = task.getStatus().name();
                } else {
                    boolean viewerHasStarted = task.getStartedBy() != null
                        && task.getStartedBy().stream().anyMatch(u -> u.getId().equals(viewer.getId()));
                    if (viewerHasStarted) {
                        myStatus = TaskStatus.IN_PROGRESS.name();
                    } else {
                        TaskStatus baseline = task.getStatus();
                        // A later-stage shared status reflects someone ELSE's
                        // outcome, not this viewer's — they simply haven't
                        // started, so show PENDING rather than borrowing
                        // another assignee's progress.
                        myStatus = (baseline == TaskStatus.UNDER_REVIEW || baseline == TaskStatus.COMPLETED || baseline == TaskStatus.REJECTED)
                            ? TaskStatus.PENDING.name()
                            : baseline.name();
                    }
                }
            } else {
                myStatus = task.getStatus().name();
            }
        }

        return TaskResponse.builder()
            .id(task.getId())
            .title(task.getTitle())
            .description(task.getDescription())
            .status(task.getStatus())
            .myStatus(myStatus)
            .mySubmissionStatus(mySubmissionStatus)
            .myReviewFeedback(myReviewFeedback)
            .priority(task.getPriority())
            .projectId(task.getProject() != null ? task.getProject().getId() : null)
            .projectName(task.getProject() != null ? task.getProject().getName() : null)
            .sprintId(task.getSprint() != null ? task.getSprint().getId() : null)
            .sprintName(task.getSprint() != null ? task.getSprint().getName() : null)
            .milestoneId(task.getMilestone() != null ? task.getMilestone().getId() : null)
            .assignee(userMapper.toSummaryResponse(task.getAssignee()))
            .reporter(userMapper.toSummaryResponse(task.getReporter()))
            .assignees(assignees)
            .parentTaskId(task.getParentTask() != null ? task.getParentTask().getId() : null)
            .subtasks(subtasks)
            .deadline(task.getDeadline())
            .estimatedHours(task.getEstimatedHours())
            .actualHours(task.getActualHours())
            .storyPoints(task.getStoryPoints())
            .labels(labels)
            .tags(tags)
            .checklist(task.getChecklist())
            .recurring(task.isRecurring())
            .boardColumn(task.getBoardColumn())
            .boardOrder(task.getBoardOrder())
            .completedAt(task.getCompletedAt())
            .createdAt(task.getCreatedAt())
            .updatedAt(task.getUpdatedAt())
            .createdBy(task.getCreatedBy())
            .commentCount(task.getComments().size())
            .attachmentCount(task.getAttachments().size())
            .subtaskCount(task.getSubtasks().size())
            .completedSubtaskCount((int) completedSubtasks)
            .build();
    }

    private TaskResponse toResponseSimple(Task task) {
        return TaskResponse.builder()
            .id(task.getId()).title(task.getTitle()).status(task.getStatus())
            .priority(task.getPriority()).deadline(task.getDeadline())
            .assignee(userMapper.toSummaryResponse(task.getAssignee()))
            .build();
    }

    @SuppressWarnings("unchecked")
    private List<String> parseJsonList(String json) {
        if (json == null || json.isEmpty()) return Collections.emptyList();
        try { return objectMapper.readValue(json, List.class); } catch (Exception e) { return Collections.emptyList(); }
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmailIgnoreCaseAndDeletedFalse(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", email));
    }

    private Task findTaskById(UUID id) {
        return taskRepository.findById(id)
            .filter(t -> !t.isDeleted())
            .orElseThrow(() -> new ResourceNotFoundException("Task", id.toString()));
    }

    private void logActivity(User user, Task task, String action, String description) {
        ActivityLog log = ActivityLog.builder()
            .user(user).task(task).action(action)
            .entityType("TASK").entityId(task.getId())
            .description(description).build();
        activityLogRepository.save(log);
    }

    private String normalizeSearch(String search) {
        return search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
    }
    // ── Per-user task statuses ────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTaskUserStatuses(UUID taskId) {
        Task task = findTaskById(taskId);
        List<Map<String, Object>> result = new ArrayList<>();

        // Baseline status when a person hasn't submitted anything yet: never the
        // shared task.status directly, since that may already reflect a *different*
        // assignee's UNDER_REVIEW/COMPLETED/REJECTED outcome. Someone who simply
        // hasn't acted yet should show PENDING/IN_PROGRESS, not someone else's result.
        // Default baseline for anyone who has neither started nor submitted:
        // PENDING, unless the task itself was created directly into a later
        // stage (rare, but preserves existing behavior for such tasks).
        TaskStatus notStartedBaseline = (task.getStatus() == TaskStatus.UNDER_REVIEW
            || task.getStatus() == TaskStatus.COMPLETED
            || task.getStatus() == TaskStatus.REJECTED)
            ? TaskStatus.PENDING
            : task.getStatus();

        for (User assignee : task.getAssignees()) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("userId", assignee.getId().toString());
            entry.put("userFullName", assignee.getFullName());

            // Use this specific person's most recent submission only — not
            // whichever submission happened to be inserted last across the
            // whole collection (which is not guaranteed to be chronological).
            TaskSubmission latest = task.getSubmissions().stream()
                .filter(s -> s.getSubmittedBy() != null && s.getSubmittedBy().getId().equals(assignee.getId()))
                .max(java.util.Comparator.comparing(TaskSubmission::getCreatedAt,
                    java.util.Comparator.nullsFirst(java.util.Comparator.naturalOrder())))
                .orElse(null);

            boolean hasStarted = task.getStartedBy() != null
                && task.getStartedBy().stream().anyMatch(u -> u.getId().equals(assignee.getId()));

            TaskStatus individualStatus;
            if (latest == null) {
                // No submission yet — this person's own start/not-started
                // state is the source of truth, never another assignee's
                // submission/approval outcome.
                individualStatus = hasStarted ? TaskStatus.IN_PROGRESS : notStartedBaseline;
            } else if ("APPROVED".equals(latest.getStatus()))      individualStatus = TaskStatus.COMPLETED;
            else if ("REJECTED".equals(latest.getStatus()))        individualStatus = TaskStatus.REJECTED;
            else                                                    individualStatus = TaskStatus.UNDER_REVIEW;

            entry.put("status", individualStatus.name());
            if (latest != null) {
                entry.put("submissionId", latest.getId().toString());
                entry.put("reviewFeedback", latest.getReviewFeedback());
            }
            result.add(entry);
        }

        // If no multi-assignees, check the primary assignee
        if (task.getAssignees().isEmpty() && task.getAssignee() != null) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("userId", task.getAssignee().getId().toString());
            entry.put("userFullName", task.getAssignee().getFullName());
            entry.put("status", task.getStatus().name());
            result.add(entry);
        }
        return result;
    }

    // ── Start work (per-assignee) ─────────────────────────────
    @Override
    public TaskResponse startWork(UUID taskId, String userEmail) {
        User user = findUserByEmail(userEmail);
        Task task = findTaskById(taskId);

        boolean isMultiAssignee = task.getAssignees() != null && task.getAssignees().size() > 1;

        if (isMultiAssignee) {
            // Only add this person to startedBy — do NOT touch the shared
            // task.status field. On a multi-assignee task the shared status
            // is managed exclusively by computeOverallStatus(), which fires
            // on submit and review. Moving the shared status to IN_PROGRESS
            // here was causing every other assignee to appear "In Progress"
            // immediately — because their per-viewer status fell back to the
            // shared baseline when they hadn't started yet.
            task.getStartedBy().add(user);
        } else {
            // Single-assignee task: shared status is unambiguous.
            task.setStatus(TaskStatus.IN_PROGRESS);
        }

        Task saved = taskRepository.save(task);
        logActivity(user, saved, "STATUS_CHANGED", "Started work: " + user.getFullName());
        return toResponse(saved, user);
    }

    // ── Submit task for review ────────────────────────────────
    @Override
    public void submitTask(UUID taskId, String description, String fileUrl, String githubLink, String liveDemoLink, String userEmail) {
        User user = findUserByEmail(userEmail);
        Task task = findTaskById(taskId);

        boolean alreadyPending = task.getSubmissions().stream()
            .anyMatch(s -> s.getSubmittedBy() != null && s.getSubmittedBy().getId().equals(user.getId())
                && "PENDING".equals(s.getStatus()));
        if (alreadyPending) {
            throw new com.syntaxcore.workforce.exception.BusinessException(
                "You already have a submission pending review for this task.");
        }

        TaskSubmission submission = TaskSubmission.builder()
            .task(task).submittedBy(user)
            .description(description)
            .submissionFileUrl(fileUrl)
            .githubLink(githubLink)
            .liveDemoLink(liveDemoLink)
            .status("PENDING").build();

        task.getSubmissions().add(submission);

        // Always recompute the shared overall status from the full assignee
        // set after a new submission, whether single or multi-assignee.
        // The new computeOverallStatus correctly handles every combination:
        //   - some still working + some submitted → IN_PROGRESS
        //   - all submitted, none yet reviewed → UNDER_REVIEW
        //   - all approved → COMPLETED
        boolean isMultiAssignee = task.getAssignees() != null && task.getAssignees().size() > 1;
        if (!isMultiAssignee) {
            task.setStatus(TaskStatus.UNDER_REVIEW);
        } else {
            task.setStatus(computeOverallStatus(task));
        }

        taskRepository.save(task);
        logActivity(user, task, "TASK_SUBMITTED", "Submitted for review by " + user.getFullName());
    }

    // ── Review a single submission (per-assignee) ─────────────
    @Override
    public TaskResponse reviewSubmission(UUID taskId, UUID submissionId, boolean approved, String feedback, String reviewerEmail) {
        User reviewer = findUserByEmail(reviewerEmail);
        Task task = findTaskById(taskId);

        TaskSubmission submission = task.getSubmissions().stream()
            .filter(s -> s.getId().equals(submissionId))
            .findFirst()
            .orElseThrow(() -> new ResourceNotFoundException("Submission", submissionId.toString()));

        if (!"PENDING".equals(submission.getStatus())) {
            throw new com.syntaxcore.workforce.exception.BusinessException(
                "This submission has already been reviewed.");
        }

        submission.setStatus(approved ? "APPROVED" : "REJECTED");
        submission.setReviewFeedback(feedback);
        submission.setReviewedAt(LocalDateTime.now());
        submission.setReviewedBy(reviewer);

        TaskStatus overall = computeOverallStatus(task);
        task.setStatus(overall);
        if (overall == TaskStatus.COMPLETED) task.setCompletedAt(LocalDateTime.now());

        Task saved = taskRepository.save(task);
        logActivity(reviewer, saved, approved ? "TASK_APPROVED" : "TASK_REJECTED",
            (approved ? "Approved" : "Rejected") + " submission by " +
            (submission.getSubmittedBy() != null ? submission.getSubmittedBy().getFullName() : "assignee") +
            " — reviewed by " + reviewer.getFullName() + (feedback != null ? ": " + feedback : ""));

        // Notify only the person whose submission was actually reviewed —
        // not every assignee on the task.
        if (submission.getSubmittedBy() != null) {
            String notifTitle = approved ? "Task Approved!" : "Task Rejected";
            String notifMsg = approved
                ? "Your submission for '" + saved.getTitle() + "' has been approved."
                : "Your submission for '" + saved.getTitle() + "' was rejected. Feedback: " + feedback;
            NotificationType notifType = approved ? NotificationType.TASK_APPROVED : NotificationType.TASK_REJECTED;
            notificationService.sendNotification(submission.getSubmittedBy(), reviewer, notifType, notifTitle, notifMsg, "TASK", saved.getId());
        }

        return toResponse(saved, submission.getSubmittedBy());
    }

    /**
     * Derives the task's overall status from each assignee's most recent submission:
     * - At least one submission is still PENDING review → UNDER_REVIEW
     * - Every assignee's latest submission is APPROVED → COMPLETED
     * - Otherwise (a mix including at least one REJECTED, none PENDING) → REJECTED
     * Single-assignee tasks reduce to the same rule with one person.
     */
    private TaskStatus computeOverallStatus(Task task) {
        java.util.Collection<User> people = task.getAssignees() != null && !task.getAssignees().isEmpty()
            ? task.getAssignees()
            : (task.getAssignee() != null ? java.util.List.of(task.getAssignee()) : java.util.List.of());

        if (people.isEmpty()) return task.getStatus();

        // Categorise each assignee's current position:
        // - notSubmitted: no submission record at all (still working)
        // - pending:      has submitted, awaiting review
        // - approved:     latest submission was approved
        // - rejected:     latest submission was rejected
        int notSubmitted = 0, pending = 0, approved = 0, rejected = 0;

        for (User person : people) {
            String latestStatus = task.getSubmissions().stream()
                .filter(s -> s.getSubmittedBy() != null && s.getSubmittedBy().getId().equals(person.getId()))
                .max(java.util.Comparator.comparing(TaskSubmission::getCreatedAt,
                    java.util.Comparator.nullsFirst(java.util.Comparator.naturalOrder())))
                .map(TaskSubmission::getStatus)
                .orElse(null);

            if      (latestStatus == null)         notSubmitted++;
            else if ("PENDING".equals(latestStatus))  pending++;
            else if ("APPROVED".equals(latestStatus)) approved++;
            else                                      rejected++;
        }

        int total = people.size();

        // All approved → entire task is done
        if (approved == total)                              return TaskStatus.COMPLETED;

        // Some people still haven't submitted → task is actively in progress
        if (notSubmitted > 0)                              return TaskStatus.IN_PROGRESS;

        // Everyone has submitted (notSubmitted == 0 at this point).
        // If any submission is still awaiting review → UNDER_REVIEW.
        if (pending > 0)                                   return TaskStatus.UNDER_REVIEW;

        // All submissions have been reviewed (no pending, no notSubmitted).
        // If we have a mix of approved + rejected → the rejected people need
        // to resubmit. Keep as UNDER_REVIEW so their work stays visible
        // in the approval queue rather than closing the task prematurely.
        if (rejected > 0 && approved > 0)                 return TaskStatus.UNDER_REVIEW;

        // Everyone was rejected with no one approved
        return TaskStatus.REJECTED;
    }

    // ── Legacy whole-task review (kept for single-assignee tasks /
    //    backward compatibility with older clients) ─────────────
    @Override
    public TaskResponse reviewTask(UUID taskId, boolean approved, String feedback, String reviewerEmail) {
        Task task = findTaskById(taskId);
        TaskSubmission latestPending = task.getSubmissions().stream()
            .filter(s -> "PENDING".equals(s.getStatus()))
            .max(java.util.Comparator.comparing(TaskSubmission::getCreatedAt,
                java.util.Comparator.nullsFirst(java.util.Comparator.naturalOrder())))
            .orElse(null);

        if (latestPending == null) {
            throw new com.syntaxcore.workforce.exception.BusinessException(
                "There is no pending submission to review on this task.");
        }
        return reviewSubmission(taskId, latestPending.getId(), approved, feedback, reviewerEmail);
    }


    // ── Role-based assignment validation ─────────────────────
    /**
     * Creator can only assign tasks to users with the same or lower role.
     * SUPER_ADMIN and ADMINISTRATOR bypass this restriction.
     */
    private void validateAssigneeRole(User creator, User assignee) {
        com.syntaxcore.workforce.enums.Role creatorRole = creator.getRole();
        com.syntaxcore.workforce.enums.Role assigneeRole = assignee.getRole();

        // Admins can assign to anyone
        if (creatorRole == com.syntaxcore.workforce.enums.Role.SUPER_ADMIN ||
            creatorRole == com.syntaxcore.workforce.enums.Role.ADMINISTRATOR) {
            return;
        }

        // Role ordinal: SUPER_ADMIN=0 (highest), INTERN=5 (lowest)
        // Creator can assign to same-level or lower (higher ordinal = lower rank)
        // Block if assignee.ordinal() < creator.ordinal() → assignee has higher authority
        if (assigneeRole.ordinal() < creatorRole.ordinal()) {
            throw new com.syntaxcore.workforce.exception.BusinessException(
                "You cannot assign tasks to " + assigneeRole.getDisplayName() +
                ". You can only assign to same or lower roles.");
        }
    }


    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPendingSubmissions(String reviewerEmail) {
        // Query PENDING submissions directly rather than going through
        // Task.status. submitTask() intentionally leaves the shared
        // Task.status untouched for multi-assignee tasks (so one person
        // submitting doesn't make the task appear "under review" for every
        // other assignee) — which means filtering tasks by
        // status == UNDER_REVIEW would silently exclude every pending
        // submission on a multi-assignee task from this queue. Going
        // straight to the submission records themselves is correct
        // regardless of how many assignees a task has.
        List<TaskSubmission> pendingSubmissions = taskSubmissionRepository.findByStatusAndDeletedFalse("PENDING");

        List<Map<String, Object>> result = new ArrayList<>();
        for (TaskSubmission sub : pendingSubmissions) {
            Task t = sub.getTask();
            if (t == null || t.isDeleted()) continue;

            Map<String, Object> entry = new HashMap<>();
            entry.put("taskId", t.getId().toString());
            entry.put("taskTitle", t.getTitle());
            entry.put("taskPriority", t.getPriority() != null ? t.getPriority().name() : "MEDIUM");
            entry.put("id", sub.getId().toString());
            entry.put("description", sub.getDescription());
            entry.put("submissionFileUrl", sub.getSubmissionFileUrl());
            entry.put("githubLink", sub.getGithubLink());
            entry.put("liveDemoLink", sub.getLiveDemoLink());
            entry.put("status", "PENDING");
            entry.put("submittedAt", sub.getCreatedAt() != null ? sub.getCreatedAt().toString() : java.time.LocalDateTime.now().toString());
            entry.put("reviewFeedback", sub.getReviewFeedback());
            User submitter = sub.getSubmittedBy();
            Map<String, Object> user = new HashMap<>();
            if (submitter != null) {
                user.put("id", submitter.getId().toString());
                user.put("fullName", submitter.getFullName());
                user.put("role", submitter.getRole() != null ? submitter.getRole().name() : "EMPLOYEE");
            } else {
                user.put("id", "");
                user.put("fullName", "Unknown");
                user.put("role", "EMPLOYEE");
            }
            entry.put("submittedBy", user);
            result.add(entry);
        }

        // Sort oldest-first so reviewers see whoever has been waiting longest
        // at the top, consistent with the prior per-task ordering.
        result.sort(java.util.Comparator.comparing(e -> (String) e.get("submittedAt")));

        // Legacy fallback: any task marked UNDER_REVIEW with no TaskSubmission
        // rows at all (covers pre-existing data from before per-submission
        // tracking existed). These are necessarily single-assignee-style
        // records since multi-assignee tasks always create a TaskSubmission
        // row on submit.
        List<Task> legacyTasks = taskRepository.findByStatusAndDeletedFalse(TaskStatus.UNDER_REVIEW);
        for (Task t : legacyTasks) {
            boolean hasAnySubmission = t.getSubmissions() != null && !t.getSubmissions().isEmpty();
            if (hasAnySubmission) continue; // already covered by the submission-based query above

            Map<String, Object> entry = new HashMap<>();
            entry.put("taskId", t.getId().toString());
            entry.put("taskTitle", t.getTitle());
            entry.put("taskPriority", t.getPriority() != null ? t.getPriority().name() : "MEDIUM");
            entry.put("id", t.getId().toString() + "_sub");
            entry.put("description", "Task submitted for review.");
            entry.put("submissionFileUrl", null);
            entry.put("githubLink", null);
            entry.put("liveDemoLink", null);
            entry.put("status", "PENDING");
            entry.put("submittedAt", t.getUpdatedAt() != null ? t.getUpdatedAt().toString() : java.time.LocalDateTime.now().toString());
            entry.put("reviewFeedback", null);
            User assignee = t.getAssignee();
            Map<String, Object> user = new HashMap<>();
            if (assignee != null) {
                user.put("id", assignee.getId().toString());
                user.put("fullName", assignee.getFullName());
                user.put("role", assignee.getRole() != null ? assignee.getRole().name() : "EMPLOYEE");
            } else {
                user.put("id", "");
                user.put("fullName", "Unknown");
                user.put("role", "EMPLOYEE");
            }
            entry.put("submittedBy", user);
            result.add(entry);
        }
        return result;
    }


}
