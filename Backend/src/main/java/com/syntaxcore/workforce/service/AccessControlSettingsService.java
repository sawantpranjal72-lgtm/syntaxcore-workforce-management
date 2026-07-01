package com.syntaxcore.workforce.service;

import com.syntaxcore.workforce.dto.response.AccessControlSettingsResponse;

import java.util.List;
import java.util.Map;

public interface AccessControlSettingsService {
    AccessControlSettingsResponse getSettings();
    AccessControlSettingsResponse updateMenuAccess(Map<String, List<String>> menuAccess);
    AccessControlSettingsResponse updateFeatureFlags(Map<String, Boolean> featureFlags);
    AccessControlSettingsResponse updateExamPermissions(Map<String, com.syntaxcore.workforce.dto.request.ExamPermissionsUpdateRequest.ExamPermissionEntry> examPermissions);

    /** Whether the given role may create/edit/delete/publish exams. SUPER_ADMIN always returns true. */
    boolean canManageExams(String roleName);

    /** Whether the given role may take/attempt exams. */
    boolean canTakeExams(String roleName);
}
