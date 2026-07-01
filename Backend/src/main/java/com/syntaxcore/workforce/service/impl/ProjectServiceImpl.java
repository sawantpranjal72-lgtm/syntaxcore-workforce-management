package com.syntaxcore.workforce.service.impl;

import com.syntaxcore.workforce.dto.request.ProjectRequest;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import com.syntaxcore.workforce.dto.response.ProjectResponse;
import com.syntaxcore.workforce.dto.response.UserSummaryResponse;
import com.syntaxcore.workforce.entity.Project;
import com.syntaxcore.workforce.entity.User;
import com.syntaxcore.workforce.enums.ProjectStatus;
import com.syntaxcore.workforce.enums.TaskStatus;
import com.syntaxcore.workforce.exception.ResourceNotFoundException;
import com.syntaxcore.workforce.repository.ProjectRepository;
import com.syntaxcore.workforce.repository.TaskRepository;
import com.syntaxcore.workforce.repository.UserRepository;
import com.syntaxcore.workforce.service.ProjectService;
import com.syntaxcore.workforce.util.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final UserMapper userMapper;

    @Override
    public ProjectResponse createProject(ProjectRequest request, String creatorEmail) {
        User manager = request.getManagerId() != null
            ? userRepository.findById(request.getManagerId())
                .orElseThrow(() -> new ResourceNotFoundException("Manager", request.getManagerId().toString()))
            : userRepository.findByEmailIgnoreCaseAndDeletedFalse(creatorEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", creatorEmail));

        Project project = Project.builder()
            .name(request.getName())
            .code(request.getCode() != null ? request.getCode() : generateCode(request.getName()))
            .description(request.getDescription())
            .status(request.getStatus() != null ? request.getStatus() : ProjectStatus.PLANNING)
            .priority(request.getPriority())
            .manager(manager)
            .startDate(request.getStartDate())
            .endDate(request.getEndDate())
            .budget(request.getBudget())
            .techStack(request.getTechStack())
            .repositoryUrl(request.getRepositoryUrl())
            .avatarColor(request.getAvatarColor() != null ? request.getAvatarColor() : randomColor())
            .build();

        if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            Set<User> members = new HashSet<>(userRepository.findAllById(request.getMemberIds()));
            project.setMembers(members);
        }

        return toResponse(projectRepository.save(project));
    }

    @Override
    public ProjectResponse updateProject(UUID id, ProjectRequest request) {
        Project project = findById(id);
        if (request.getName() != null) project.setName(request.getName());
        if (request.getDescription() != null) project.setDescription(request.getDescription());
        if (request.getStatus() != null) project.setStatus(request.getStatus());
        if (request.getPriority() != null) project.setPriority(request.getPriority());
        if (request.getStartDate() != null) project.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) project.setEndDate(request.getEndDate());
        if (request.getBudget() != null) project.setBudget(request.getBudget());
        if (request.getTechStack() != null) project.setTechStack(request.getTechStack());
        if (request.getRepositoryUrl() != null) project.setRepositoryUrl(request.getRepositoryUrl());
        if (request.getManagerId() != null) {
            userRepository.findById(request.getManagerId()).ifPresent(project::setManager);
        }
        if (request.getMemberIds() != null) {
            Set<User> members = new HashSet<>(userRepository.findAllById(request.getMemberIds()));
            project.setMembers(members);
        }
        return toResponse(projectRepository.save(project));
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectResponse getProject(UUID id) {
        return toResponse(findById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ProjectResponse> getAllProjects(ProjectStatus status, UUID managerId, String search, Pageable pageable) {
        Page<Project> page = projectRepository.findAllWithFilters(status, managerId, normalizeSearch(search), pageable);
        return PagedResponse.from(page.map(this::toResponse));
    }

    @Override
    public void deleteProject(UUID id) {
        Project project = findById(id);
        project.setDeleted(true);
        project.setDeletedAt(LocalDateTime.now());
        projectRepository.save(project);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectResponse> getMyProjects(String userEmail) {
        User user = userRepository.findByEmailIgnoreCaseAndDeletedFalse(userEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));
        return projectRepository.findProjectsByMember(user.getId())
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public ProjectResponse addMember(UUID projectId, UUID userId) {
        Project project = findById(projectId);
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));
        project.getMembers().add(user);
        return toResponse(projectRepository.save(project));
    }

    @Override
    public ProjectResponse removeMember(UUID projectId, UUID userId) {
        Project project = findById(projectId);
        project.getMembers().removeIf(m -> m.getId().equals(userId));
        return toResponse(projectRepository.save(project));
    }

    private ProjectResponse toResponse(Project project) {
        List<UserSummaryResponse> members = project.getMembers().stream()
            .map(userMapper::toSummaryResponse).collect(Collectors.toList());

        long totalTasks = project.getTasks().stream().filter(t -> !t.isDeleted()).count();
        long completedTasks = project.getTasks().stream()
            .filter(t -> !t.isDeleted() && t.getStatus() == TaskStatus.COMPLETED).count();
        long activeSprints = project.getSprints().stream()
            .filter(s -> !s.isDeleted() && s.isActive()).count();
        long completedMilestones = project.getMilestones().stream()
            .filter(m -> !m.isDeleted() && m.isCompleted()).count();

        double completionPct = totalTasks > 0 ? (double) completedTasks / totalTasks * 100 : 0;

        return ProjectResponse.builder()
            .id(project.getId())
            .name(project.getName())
            .code(project.getCode())
            .description(project.getDescription())
            .status(project.getStatus())
            .priority(project.getPriority())
            .manager(userMapper.toSummaryResponse(project.getManager()))
            .members(members)
            .startDate(project.getStartDate())
            .endDate(project.getEndDate())
            .budget(project.getBudget())
            .techStack(project.getTechStack())
            .repositoryUrl(project.getRepositoryUrl())
            .avatarColor(project.getAvatarColor())
            .createdAt(project.getCreatedAt())
            .updatedAt(project.getUpdatedAt())
            .totalTasks((int) totalTasks)
            .completedTasks((int) completedTasks)
            .pendingTasks((int) (totalTasks - completedTasks))
            .totalSprints(project.getSprints().size())
            .activeSprints((int) activeSprints)
            .totalMilestones(project.getMilestones().size())
            .completedMilestones((int) completedMilestones)
            .completionPercentage(completionPct)
            .build();
    }

    private Project findById(UUID id) {
        return projectRepository.findById(id)
            .filter(p -> !p.isDeleted())
            .orElseThrow(() -> new ResourceNotFoundException("Project", id.toString()));
    }

    private String generateCode(String name) {
        String stripped = name.replaceAll("[^A-Za-z0-9]", "");
        String code = stripped.isEmpty() ? "PROJ" : stripped.substring(0, Math.min(stripped.length(), 4)).toUpperCase();
        return code + "-" + String.format("%03d", (int)(Math.random() * 900) + 100);
    }

    private String randomColor() {
        String[] colors = {"#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"};
        return colors[new Random().nextInt(colors.length)];
    }

    private String normalizeSearch(String search) {
        return search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
    }
}
