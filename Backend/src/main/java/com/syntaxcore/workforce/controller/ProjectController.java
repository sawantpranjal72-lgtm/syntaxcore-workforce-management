package com.syntaxcore.workforce.controller;

import com.syntaxcore.workforce.dto.request.ProjectRequest;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import com.syntaxcore.workforce.dto.response.ProjectResponse;
import com.syntaxcore.workforce.enums.ProjectStatus;
import com.syntaxcore.workforce.service.ProjectService;
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
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
@Tag(name = "Project Management", description = "Project CRUD and member management")
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER','PROJECT_MANAGER')")
    @Operation(summary = "Create project")
    public ResponseEntity<ProjectResponse> createProject(
            @Valid @RequestBody ProjectRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectService.createProject(request, userDetails.getUsername()));
    }

    @GetMapping
    @Operation(summary = "Get all projects")
    public ResponseEntity<PagedResponse<ProjectResponse>> getAllProjects(
            @RequestParam(required = false) ProjectStatus status,
            @RequestParam(required = false) UUID managerId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        return ResponseEntity.ok(projectService.getAllProjects(status, managerId, search, PageRequest.of(page, size, sort)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get project by ID")
    public ResponseEntity<ProjectResponse> getProject(@PathVariable UUID id) {
        return ResponseEntity.ok(projectService.getProject(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER','PROJECT_MANAGER')")
    @Operation(summary = "Update project")
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable UUID id,
            @RequestBody ProjectRequest request) {
        return ResponseEntity.ok(projectService.updateProject(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER')")
    @Operation(summary = "Delete project")
    public ResponseEntity<Void> deleteProject(@PathVariable UUID id) {
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my-projects")
    @Operation(summary = "Get projects for current user")
    public ResponseEntity<List<ProjectResponse>> getMyProjects(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(projectService.getMyProjects(userDetails.getUsername()));
    }

    @PostMapping("/{projectId}/members/{userId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER','PROJECT_MANAGER')")
    @Operation(summary = "Add member to project")
    public ResponseEntity<ProjectResponse> addMember(@PathVariable UUID projectId, @PathVariable UUID userId) {
        return ResponseEntity.ok(projectService.addMember(projectId, userId));
    }

    @DeleteMapping("/{projectId}/members/{userId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER','PROJECT_MANAGER')")
    @Operation(summary = "Remove member from project")
    public ResponseEntity<ProjectResponse> removeMember(@PathVariable UUID projectId, @PathVariable UUID userId) {
        return ResponseEntity.ok(projectService.removeMember(projectId, userId));
    }
}
