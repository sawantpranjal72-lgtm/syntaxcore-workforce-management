package com.syntaxcore.workforce.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccessControlSettingsResponse {
    private Map<String, List<String>> menuAccess;
    private Map<String, Boolean> featureFlags;
    private Map<String, ExamPermissionDto> examPermissions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExamPermissionDto {
        private boolean canManage;
        private boolean canTake;
    }
}
