package com.syntaxcore.workforce.util;

import com.syntaxcore.workforce.dto.response.UserDetailResponse;
import com.syntaxcore.workforce.dto.response.UserSummaryResponse;
import com.syntaxcore.workforce.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserSummaryResponse toSummaryResponse(User user) {
        if (user == null) return null;
        return UserSummaryResponse.builder()
            .id(user.getId())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .fullName(user.getFullName())
            .email(user.getEmail())
            .employeeId(user.getEmployeeId())
            .role(user.getRole())
            .jobTitle(user.getJobTitle())
            .avatarUrl(user.getAvatarUrl())
            .departmentId(user.getDepartment() != null ? user.getDepartment().getId() : null)
            .departmentName(user.getDepartment() != null ? user.getDepartment().getName() : null)
            .active(user.isActive())
            .emailVerified(user.isEmailVerified())
            .dateOfJoining(user.getDateOfJoining())
            .build();
    }

    public UserDetailResponse toDetailResponse(User user) {
        if (user == null) return null;
        return UserDetailResponse.builder()
            .id(user.getId())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .fullName(user.getFullName())
            .email(user.getEmail())
            .employeeId(user.getEmployeeId())
            .role(user.getRole())
            .jobTitle(user.getJobTitle())
            .phone(user.getPhone())
            .avatarUrl(user.getAvatarUrl())
            .bio(user.getBio())
            .skills(user.getSkills())
            .githubUrl(user.getGithubUrl())
            .linkedinUrl(user.getLinkedinUrl())
            .address(user.getAddress())
            .departmentId(user.getDepartment() != null ? user.getDepartment().getId() : null)
            .departmentName(user.getDepartment() != null ? user.getDepartment().getName() : null)
            .active(user.isActive())
            .emailVerified(user.isEmailVerified())
            .dateOfJoining(user.getDateOfJoining())
            .dateOfBirth(user.getDateOfBirth())
            .createdAt(user.getCreatedAt())
            .lastLoginAt(user.getLastLoginAt())
            .build();
    }
}
