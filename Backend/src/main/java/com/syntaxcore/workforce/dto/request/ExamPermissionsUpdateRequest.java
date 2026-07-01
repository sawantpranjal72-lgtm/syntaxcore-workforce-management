package com.syntaxcore.workforce.dto.request;

import lombok.Data;

import java.util.Map;

@Data
public class ExamPermissionsUpdateRequest {

    private Map<String, ExamPermissionEntry> examPermissions;

    @Data
    public static class ExamPermissionEntry {
        private boolean canManage;
        private boolean canTake;
    }
}
