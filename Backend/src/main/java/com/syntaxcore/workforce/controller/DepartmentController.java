package com.syntaxcore.workforce.controller;

import com.syntaxcore.workforce.dto.response.DepartmentResponse;
import com.syntaxcore.workforce.entity.Department;
import com.syntaxcore.workforce.exception.BusinessException;
import com.syntaxcore.workforce.exception.ResourceNotFoundException;
import com.syntaxcore.workforce.repository.DepartmentRepository;
import com.syntaxcore.workforce.repository.UserRepository;
import com.syntaxcore.workforce.util.EntityMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/departments")
@RequiredArgsConstructor
@Tag(name = "Departments", description = "Department management")
public class DepartmentController {

    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final EntityMapper entityMapper;

    @GetMapping
    @Operation(summary = "Get all departments")
    public ResponseEntity<List<DepartmentResponse>> getAll() {
        List<DepartmentResponse> result = departmentRepository.findByDeletedFalse()
                .stream()
                .map(entityMapper::toDepartmentResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get department by ID")
    public ResponseEntity<DepartmentResponse> getById(@PathVariable UUID id) {
        Department dept = departmentRepository.findById(id)
                .filter(d -> !d.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Department", id.toString()));
        return ResponseEntity.ok(entityMapper.toDepartmentResponse(dept));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER')")
    @Operation(summary = "Create department")
    public ResponseEntity<DepartmentResponse> create(@RequestBody Map<String, String> body) {
        if (departmentRepository.existsByName(body.get("name"))) {
            throw new BusinessException("Department already exists: " + body.get("name"));
        }
        Department dept = Department.builder()
                .name(body.get("name"))
                .code(body.get("code"))
                .description(body.get("description"))
                .active(true)
                .build();
        if (body.get("managerId") != null) {
            userRepository.findById(UUID.fromString(body.get("managerId"))).ifPresent(dept::setManager);
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(entityMapper.toDepartmentResponse(departmentRepository.save(dept)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER')")
    @Operation(summary = "Update department")
    public ResponseEntity<DepartmentResponse> update(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", id.toString()));
        if (body.get("name") != null) dept.setName(body.get("name"));
        if (body.get("code") != null) dept.setCode(body.get("code"));
        if (body.get("description") != null) dept.setDescription(body.get("description"));
        if (body.get("managerId") != null) {
            userRepository.findById(UUID.fromString(body.get("managerId"))).ifPresent(dept::setManager);
        }
        return ResponseEntity.ok(entityMapper.toDepartmentResponse(departmentRepository.save(dept)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Delete department")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", id.toString()));
        dept.setDeleted(true);
        dept.setDeletedAt(LocalDateTime.now());
        departmentRepository.save(dept);
        return ResponseEntity.noContent().build();
    }
}
