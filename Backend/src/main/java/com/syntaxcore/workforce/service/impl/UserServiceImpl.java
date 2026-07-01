package com.syntaxcore.workforce.service.impl;

import com.syntaxcore.workforce.dto.request.RegisterRequest;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import com.syntaxcore.workforce.dto.response.UserDetailResponse;
import com.syntaxcore.workforce.dto.response.UserSummaryResponse;
import com.syntaxcore.workforce.entity.User;
import com.syntaxcore.workforce.enums.Role;
import com.syntaxcore.workforce.exception.ResourceNotFoundException;
import com.syntaxcore.workforce.repository.DepartmentRepository;
import com.syntaxcore.workforce.repository.TaskRepository;
import com.syntaxcore.workforce.repository.UserRepository;
import com.syntaxcore.workforce.service.UserService;
import com.syntaxcore.workforce.util.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final TaskRepository taskRepository;
    private final UserMapper userMapper;

    @Value("${app.file.upload-dir}")
    private String uploadDir;

    @Override
    @Transactional(readOnly = true)
    public UserDetailResponse getUserById(UUID id) {
        User user = findById(id);
        UserDetailResponse response = userMapper.toDetailResponse(user);
        enrichWithStats(response, user.getId());
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetailResponse getMyProfile(String email) {
        User user = userRepository.findByEmailIgnoreCaseAndDeletedFalse(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", email));
        UserDetailResponse response = userMapper.toDetailResponse(user);
        enrichWithStats(response, user.getId());
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<UserSummaryResponse> getAllUsers(String search, Role role, UUID departmentId, Pageable pageable) {
        Page<User> page = userRepository.findAllWithFilters(normalizeSearch(search), role, departmentId, pageable);
        return PagedResponse.from(page.map(userMapper::toSummaryResponse));
    }

    @Override
    public UserDetailResponse updateUser(UUID id, RegisterRequest request) {
        User user = findById(id);
        applyUpdates(user, request);
        return userMapper.toDetailResponse(userRepository.save(user));
    }

    @Override
    public UserDetailResponse updateMyProfile(String email, RegisterRequest request) {
        User user = userRepository.findByEmailIgnoreCaseAndDeletedFalse(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", email));
        applySelfUpdates(user, request);
        return userMapper.toDetailResponse(userRepository.save(user));
    }

    @Override
    public void deleteUser(UUID id) {
        User user = findById(id);
        user.setDeleted(true);
        user.setDeletedAt(LocalDateTime.now());
        user.setActive(false);
        userRepository.save(user);
    }

    @Override
    public void toggleUserStatus(UUID id) {
        User user = findById(id);
        user.setActive(!user.isActive());
        userRepository.save(user);
    }

    @Override
    public String uploadAvatar(String email, MultipartFile file) {
        User user = userRepository.findByEmailIgnoreCaseAndDeletedFalse(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", email));
        try {
            String dir = uploadDir + "/avatars";
            Files.createDirectories(Paths.get(dir));
            String fileName = user.getId() + "_" + System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path filePath = Paths.get(dir, fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            String avatarUrl = "/uploads/avatars/" + fileName;
            user.setAvatarUrl(avatarUrl);
            userRepository.save(user);
            return avatarUrl;
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload avatar: " + e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserSummaryResponse> getUsersByDepartment(UUID departmentId) {
        return userRepository.findByDepartmentIdAndDeletedFalse(departmentId)
            .stream()
            .filter(u -> u.getRole() != Role.SUPER_ADMIN)
            .map(userMapper::toSummaryResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserSummaryResponse> getUsersByRole(Role role) {
        if (role == Role.SUPER_ADMIN) {
            return List.of();
        }
        return userRepository.findByRoleAndDeletedFalse(role)
            .stream().map(userMapper::toSummaryResponse).collect(Collectors.toList());
    }

    private void applyUpdates(User user, RegisterRequest request) {
        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getJobTitle() != null) user.setJobTitle(request.getJobTitle());
        if (request.getDateOfJoining() != null) user.setDateOfJoining(request.getDateOfJoining());
        if (request.getDepartmentId() != null) {
            departmentRepository.findById(request.getDepartmentId()).ifPresent(user::setDepartment);
        }
        if (request.getRole() != null) user.setRole(request.getRole());
    }

    /**
     * Self-service profile update (PUT /users/me). Deliberately excludes
     * role and department — those must only ever be changed through the
     * admin-only PUT /users/{id} path (applyUpdates above), which is
     * protected by @PreAuthorize on the controller. RegisterRequest carries
     * a `role` field for the admin update case; if it were applied here too,
     * any authenticated user (including STUDENT/INTERN) could grant
     * themselves SUPER_ADMIN simply by including "role" in their own
     * profile-update request body.
     */
    private void applySelfUpdates(User user, RegisterRequest request) {
        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getJobTitle() != null) user.setJobTitle(request.getJobTitle());
    }

    private void enrichWithStats(UserDetailResponse response, UUID userId) {
        response.setTotalTasksAssigned(taskRepository.countByAssigneeAndStatus(userId,
            com.syntaxcore.workforce.enums.TaskStatus.PENDING)
            + taskRepository.countByAssigneeAndStatus(userId, com.syntaxcore.workforce.enums.TaskStatus.IN_PROGRESS)
            + taskRepository.countByAssigneeAndStatus(userId, com.syntaxcore.workforce.enums.TaskStatus.COMPLETED));
        response.setCompletedTasks(taskRepository.countByAssigneeAndStatus(userId,
            com.syntaxcore.workforce.enums.TaskStatus.COMPLETED));
        response.setPendingTasks(taskRepository.countByAssigneeAndStatus(userId,
            com.syntaxcore.workforce.enums.TaskStatus.PENDING));
    }

    private User findById(UUID id) {
        return userRepository.findById(id)
            .filter(u -> !u.isDeleted())
            .orElseThrow(() -> new ResourceNotFoundException("User", id.toString()));
    }

    private String normalizeSearch(String search) {
        return search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
    }
}
