package com.syntaxcore.workforce.service.impl;

import com.syntaxcore.workforce.dto.request.ExamPermissionsUpdateRequest;
import com.syntaxcore.workforce.dto.response.AccessControlSettingsResponse;
import com.syntaxcore.workforce.entity.ExamRolePermission;
import com.syntaxcore.workforce.entity.FeatureFlag;
import com.syntaxcore.workforce.entity.RoleMenuAccess;
import com.syntaxcore.workforce.enums.Role;
import com.syntaxcore.workforce.repository.ExamRolePermissionRepository;
import com.syntaxcore.workforce.repository.FeatureFlagRepository;
import com.syntaxcore.workforce.repository.RoleMenuAccessRepository;
import com.syntaxcore.workforce.service.AccessControlSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AccessControlSettingsServiceImpl implements AccessControlSettingsService {

    // Kept in sync with frontend AccessControlService.allMenus — any menu key
    // missing here is silently dropped by sanitizeMenuAccess(), so every
    // frontend-introduced module MUST be added to this list.
    private static final List<String> ALL_MENUS = List.of(
        "dashboard", "analytics", "ai", "my-tasks", "task-approvals", "all-tasks",
        "projects", "employees", "attendance", "daily-report", "working-schedule", "leaves", "metrics",
        "chat", "notifications", "admin", "departments", "reports", "exams", "leave-email-config"
    );

    private static final Map<Role, List<String>> DEFAULT_MENU_ACCESS = Map.ofEntries(
        Map.entry(Role.SUPER_ADMIN, List.of(
            "dashboard", "analytics", "ai", "my-tasks", "task-approvals", "all-tasks", "projects",
            "employees", "attendance", "daily-report", "working-schedule", "leaves", "metrics", "chat", "notifications",
            "admin", "departments", "reports", "exams", "leave-email-config")),
        Map.entry(Role.ADMINISTRATOR, List.of(
            "dashboard", "analytics", "ai", "my-tasks", "task-approvals", "all-tasks", "projects",
            "employees", "attendance", "daily-report", "working-schedule", "leaves", "metrics", "chat", "notifications",
            "departments", "reports", "exams", "leave-email-config")),
        Map.entry(Role.PROJECT_MANAGER, List.of(
            "dashboard", "analytics", "ai", "my-tasks", "task-approvals", "all-tasks", "projects",
            "employees", "attendance", "daily-report", "leaves", "metrics", "chat", "notifications", "exams")),
        Map.entry(Role.HR_MANAGER, List.of(
            "dashboard", "analytics", "ai", "my-tasks", "task-approvals", "all-tasks", "projects",
            "employees", "attendance", "daily-report", "working-schedule", "leaves", "metrics", "chat", "notifications",
            "departments", "reports", "exams", "leave-email-config")),
        Map.entry(Role.EMPLOYEE, List.of(
            "dashboard", "ai", "my-tasks", "all-tasks", "projects", "attendance", "leaves",
            "chat", "notifications", "exams")),
        Map.entry(Role.INTERN, List.of(
            "dashboard", "ai", "my-tasks", "all-tasks", "attendance", "chat", "notifications", "exams")),
        Map.entry(Role.STUDENT, List.of(
            "dashboard", "attendance", "notifications", "exams"))
    );

    private static final Map<String, Boolean> DEFAULT_FEATURE_FLAGS = Map.of(
        "analytics", true,
        "ai", true,
        "attendance", true,
        "leave_mgmt", true,
        "chat", true,
        "reports", true
    );

    // Default exam permissions per role. SUPER_ADMIN is hardcoded to true in
    // canManageExams() regardless of what's stored, as a lockout safeguard.
    private static final Map<Role, boolean[]> DEFAULT_EXAM_PERMS = Map.of(
        // { canManage, canTake }
        Role.SUPER_ADMIN,     new boolean[]{true,  true},
        Role.ADMINISTRATOR,   new boolean[]{true,  true},
        Role.PROJECT_MANAGER, new boolean[]{true,  true},
        Role.HR_MANAGER,      new boolean[]{true,  true},
        Role.EMPLOYEE,        new boolean[]{false, true},
        Role.INTERN,          new boolean[]{false, true},
        Role.STUDENT,         new boolean[]{false, true}
    );

    private final RoleMenuAccessRepository roleMenuAccessRepository;
    private final FeatureFlagRepository featureFlagRepository;
    private final ExamRolePermissionRepository examRolePermissionRepository;

    @Override
    @Transactional(readOnly = true)
    public AccessControlSettingsResponse getSettings() {
        return AccessControlSettingsResponse.builder()
            .menuAccess(resolveMenuAccess())
            .featureFlags(resolveFeatureFlags())
            .examPermissions(resolveExamPermissions())
            .build();
    }

    @Override
    @Transactional
    public AccessControlSettingsResponse updateMenuAccess(Map<String, List<String>> menuAccess) {
        Map<String, List<String>> sanitized = sanitizeMenuAccess(menuAccess);
        roleMenuAccessRepository.deleteAllInBatch();

        List<RoleMenuAccess> rows = new ArrayList<>();
        sanitized.forEach((roleName, menus) -> {
            Role role = Role.valueOf(roleName);
            menus.forEach(menu -> rows.add(RoleMenuAccess.builder()
                .role(role)
                .menuKey(menu)
                .allowed(true)
                .build()));
        });
        roleMenuAccessRepository.saveAll(rows);
        return getSettings();
    }

    @Override
    @Transactional
    public AccessControlSettingsResponse updateFeatureFlags(Map<String, Boolean> featureFlags) {
        Map<String, Boolean> sanitized = sanitizeFeatureFlags(featureFlags);
        featureFlagRepository.deleteAllInBatch();

        List<FeatureFlag> rows = sanitized.entrySet().stream()
            .map(entry -> FeatureFlag.builder()
                .key(entry.getKey())
                .enabled(entry.getValue())
                .build())
            .toList();
        featureFlagRepository.saveAll(rows);
        return getSettings();
    }

    @Override
    @Transactional
    public AccessControlSettingsResponse updateExamPermissions(Map<String, ExamPermissionsUpdateRequest.ExamPermissionEntry> examPermissions) {
        if (examPermissions == null) examPermissions = Map.of();

        for (Role role : Role.values()) {
            ExamPermissionsUpdateRequest.ExamPermissionEntry entry = examPermissions.get(role.name());
            boolean[] defaults = DEFAULT_EXAM_PERMS.getOrDefault(role, new boolean[]{false, true});
            boolean canManage = entry != null ? entry.isCanManage() : defaults[0];
            boolean canTake   = entry != null ? entry.isCanTake()   : defaults[1];

            // SUPER_ADMIN is never allowed to be locked out of exam management.
            if (role == Role.SUPER_ADMIN) {
                canManage = true;
                canTake = true;
            }

            ExamRolePermission row = examRolePermissionRepository.findByRoleAndDeletedFalse(role)
                .orElseGet(() -> ExamRolePermission.builder().role(role).build());
            row.setCanManage(canManage);
            row.setCanTake(canTake);
            examRolePermissionRepository.save(row);
        }
        return getSettings();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canManageExams(String roleName) {
        if (roleName == null) return false;
        if ("SUPER_ADMIN".equals(roleName)) return true; // lockout safeguard
        try {
            Role role = Role.valueOf(roleName);
            return examRolePermissionRepository.findByRoleAndDeletedFalse(role)
                .map(ExamRolePermission::isCanManage)
                .orElseGet(() -> DEFAULT_EXAM_PERMS.getOrDefault(role, new boolean[]{false, true})[0]);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canTakeExams(String roleName) {
        if (roleName == null) return false;
        try {
            Role role = Role.valueOf(roleName);
            return examRolePermissionRepository.findByRoleAndDeletedFalse(role)
                .map(ExamRolePermission::isCanTake)
                .orElseGet(() -> DEFAULT_EXAM_PERMS.getOrDefault(role, new boolean[]{false, true})[1]);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private Map<String, List<String>> resolveMenuAccess() {
        Map<String, List<String>> resolved = defaultMenuAccess();
        List<RoleMenuAccess> saved = roleMenuAccessRepository.findByDeletedFalse();
        if (saved.isEmpty()) {
            return resolved;
        }

        resolved.replaceAll((role, menus) -> new ArrayList<>());
        saved.stream()
            .filter(RoleMenuAccess::isAllowed)
            .filter(row -> ALL_MENUS.contains(row.getMenuKey()))
            .forEach(row -> resolved.computeIfAbsent(row.getRole().name(), ignored -> new ArrayList<>()).add(row.getMenuKey()));
        enforceRequiredMenus(resolved);
        return resolved;
    }

    private Map<String, Boolean> resolveFeatureFlags() {
        Map<String, Boolean> resolved = new LinkedHashMap<>(DEFAULT_FEATURE_FLAGS);
        featureFlagRepository.findByDeletedFalse().forEach(row -> {
            if (DEFAULT_FEATURE_FLAGS.containsKey(row.getKey())) {
                resolved.put(row.getKey(), row.isEnabled());
            }
        });
        return resolved;
    }

    private Map<String, AccessControlSettingsResponse.ExamPermissionDto> resolveExamPermissions() {
        Map<String, AccessControlSettingsResponse.ExamPermissionDto> resolved = new LinkedHashMap<>();
        for (Role role : Role.values()) {
            boolean[] defaults = DEFAULT_EXAM_PERMS.getOrDefault(role, new boolean[]{false, true});
            resolved.put(role.name(), AccessControlSettingsResponse.ExamPermissionDto.builder()
                .canManage(defaults[0])
                .canTake(defaults[1])
                .build());
        }
        examRolePermissionRepository.findByDeletedFalse().forEach(row -> {
            boolean canManage = row.getRole() == Role.SUPER_ADMIN || row.isCanManage();
            resolved.put(row.getRole().name(), AccessControlSettingsResponse.ExamPermissionDto.builder()
                .canManage(canManage)
                .canTake(row.isCanTake())
                .build());
        });
        return resolved;
    }

    private Map<String, List<String>> sanitizeMenuAccess(Map<String, List<String>> menuAccess) {
        Map<String, List<String>> source = menuAccess == null ? defaultMenuAccess() : menuAccess;
        Map<String, List<String>> sanitized = defaultMenuAccess();
        sanitized.replaceAll((role, menus) -> new ArrayList<>());

        for (Role role : Role.values()) {
            List<String> menus = source.getOrDefault(role.name(), DEFAULT_MENU_ACCESS.getOrDefault(role, List.of()));
            List<String> allowed = menus.stream()
                .filter(ALL_MENUS::contains)
                .distinct()
                .collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
            sanitized.put(role.name(), allowed);
        }
        enforceRequiredMenus(sanitized);
        return sanitized;
    }

    private Map<String, Boolean> sanitizeFeatureFlags(Map<String, Boolean> featureFlags) {
        Map<String, Boolean> sanitized = new LinkedHashMap<>(DEFAULT_FEATURE_FLAGS);
        if (featureFlags != null) {
            featureFlags.forEach((key, enabled) -> {
                if (DEFAULT_FEATURE_FLAGS.containsKey(key)) {
                    sanitized.put(key, Boolean.TRUE.equals(enabled));
                }
            });
        }
        return sanitized;
    }

    private Map<String, List<String>> defaultMenuAccess() {
        Map<String, List<String>> defaults = new LinkedHashMap<>();
        for (Role role : Role.values()) {
            defaults.put(role.name(), new ArrayList<>(DEFAULT_MENU_ACCESS.getOrDefault(role, List.of("dashboard"))));
        }
        return defaults;
    }

    private void enforceRequiredMenus(Map<String, List<String>> menuAccess) {
        menuAccess.forEach((role, menus) -> {
            if (!menus.contains("dashboard")) {
                menus.add("dashboard");
            }
            if (Role.SUPER_ADMIN.name().equals(role) && !menus.contains("admin")) {
                menus.add("admin");
            }
        });
    }
}
