package com.syntaxcore.workforce.service;

import com.syntaxcore.workforce.dto.request.RegisterRequest;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import com.syntaxcore.workforce.dto.response.UserDetailResponse;
import com.syntaxcore.workforce.dto.response.UserSummaryResponse;
import com.syntaxcore.workforce.enums.Role;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface UserService {
    UserDetailResponse getUserById(UUID id);
    UserDetailResponse getMyProfile(String email);
    PagedResponse<UserSummaryResponse> getAllUsers(String search, Role role, UUID departmentId, Pageable pageable);
    UserDetailResponse updateUser(UUID id, RegisterRequest request);
    UserDetailResponse updateMyProfile(String email, RegisterRequest request);
    void deleteUser(UUID id);
    void toggleUserStatus(UUID id);
    String uploadAvatar(String email, MultipartFile file);
    List<UserSummaryResponse> getUsersByDepartment(UUID departmentId);
    List<UserSummaryResponse> getUsersByRole(Role role);
}
