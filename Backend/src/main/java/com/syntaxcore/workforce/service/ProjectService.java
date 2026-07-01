package com.syntaxcore.workforce.service;

import com.syntaxcore.workforce.dto.request.ProjectRequest;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import com.syntaxcore.workforce.dto.response.ProjectResponse;
import com.syntaxcore.workforce.enums.ProjectStatus;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ProjectService {
    ProjectResponse createProject(ProjectRequest request, String creatorEmail);
    ProjectResponse updateProject(UUID id, ProjectRequest request);
    ProjectResponse getProject(UUID id);
    PagedResponse<ProjectResponse> getAllProjects(ProjectStatus status, UUID managerId, String search, Pageable pageable);
    void deleteProject(UUID id);
    List<ProjectResponse> getMyProjects(String userEmail);
    ProjectResponse addMember(UUID projectId, UUID userId);
    ProjectResponse removeMember(UUID projectId, UUID userId);
}
