package com.syntaxcore.workforce.controller;

import com.syntaxcore.workforce.entity.*;
import com.syntaxcore.workforce.enums.Role;
import com.syntaxcore.workforce.repository.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','PROJECT_MANAGER','HR_MANAGER')")
@Tag(name = "Reports", description = "Downloadable workforce reports (CSV)")
public class ReportController {

    private final UserRepository       userRepo;
    private final AttendanceRepository attendanceRepo;
    private final TaskRepository       taskRepo;
    private final ProjectRepository    projectRepo;
    private final LeaveRepository      leaveRepo;
    private final DepartmentRepository departmentRepo;

    @GetMapping("/{type}")
    @Operation(summary = "Download report as CSV")
    public ResponseEntity<byte[]> generate(
            @PathVariable String type,
            @RequestParam(defaultValue = "") String from,
            @RequestParam(defaultValue = "") String to,
            @RequestParam(defaultValue = "csv") String format) {

        LocalDate dateFrom = from.isEmpty() ? LocalDate.now().withDayOfMonth(1) : LocalDate.parse(from);
        LocalDate dateTo   = to.isEmpty()   ? LocalDate.now()                   : LocalDate.parse(to);

        String csv = switch (type.toLowerCase()) {
            case "employees"   -> employees();
            case "attendance"  -> attendance(dateFrom, dateTo);
            case "tasks"       -> tasks();
            case "projects"    -> projects();
            case "leaves"      -> leaves(dateFrom, dateTo);
            case "internship"  -> internship();
            case "department"  -> departments();
            case "performance" -> performance();
            case "payroll"     -> payroll(dateFrom, dateTo);
            default            -> generic(type, dateFrom, dateTo);
        };

        String filename = type + "-report-" + dateFrom + "-to-" + dateTo + ".csv";
        byte[] bytes = addBom(csv);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
            .body(bytes);
    }

    // ── Employee Report ──────────────────────────────────────

    private String employees() {
        StringBuilder sb = new StringBuilder();
        sb.append("Employee ID,Full Name,Email,Role,Department,Job Title,Phone,Active,Email Verified,Date of Joining\n");
        userRepo.findByDeletedFalseOrderByCreatedAtDesc().forEach(u ->
            sb.append(row(
                u.getEmployeeId(), u.getFullName(), u.getEmail(),
                u.getRole() != null ? u.getRole().getDisplayName() : "",
                u.getDepartment() != null ? u.getDepartment().getName() : "",
                u.getJobTitle(), u.getPhone(),
                yesNo(u.isActive()), yesNo(u.isEmailVerified()),
                u.getDateOfJoining() != null ? u.getDateOfJoining().toString() : ""
            ))
        );
        return sb.toString();
    }

    // ── Attendance Report ────────────────────────────────────

    private String attendance(LocalDate from, LocalDate to) {
        StringBuilder sb = new StringBuilder();
        sb.append("Date,Employee ID,Full Name,Department,Check In,Check Out,Total Hours,Status,Remote,Notes\n");
        attendanceRepo.findByDateBetweenOrderByDateDesc(from, to).forEach(a ->
            sb.append(row(
                a.getDate().toString(),
                a.getUser() != null ? a.getUser().getEmployeeId() : "",
                a.getUser() != null ? a.getUser().getFullName() : "",
                a.getUser() != null && a.getUser().getDepartment() != null ? a.getUser().getDepartment().getName() : "",
                a.getCheckIn() != null ? a.getCheckIn().toString() : "",
                a.getCheckOut() != null ? a.getCheckOut().toString() : "",
                a.getTotalHours() != null ? String.format("%.2f", a.getTotalHours()) : "",
                a.getStatus(), yesNo(a.isRemote()), a.getNotes()
            ))
        );
        return sb.toString();
    }

    // ── Task Report ──────────────────────────────────────────

    private String tasks() {
        StringBuilder sb = new StringBuilder();
        sb.append("Title,Status,Priority,Assignee,Project,Deadline,Est. Hours,Actual Hours,Story Points,Created\n");
        // Use getAllTasks-style filtered query instead of findAll() to avoid loading deleted tasks
        taskRepo.findAllWithFilters(null, null, null, null, "",
                org.springframework.data.domain.PageRequest.of(0, 10000))
            .stream().forEach(t ->
                sb.append(row(
                    t.getTitle(),
                    t.getStatus() != null ? t.getStatus().name() : "",
                    t.getPriority() != null ? t.getPriority().name() : "",
                    t.getAssignee() != null ? t.getAssignee().getFullName() : "Unassigned",
                    t.getProject() != null ? t.getProject().getName() : "",
                    t.getDeadline() != null ? t.getDeadline().toString() : "",
                    t.getEstimatedHours() != null ? t.getEstimatedHours().toString() : "",
                    t.getActualHours() != null ? t.getActualHours().toString() : "",
                    t.getStoryPoints() != null ? t.getStoryPoints().toString() : "",
                    t.getCreatedAt() != null ? t.getCreatedAt().toLocalDate().toString() : ""
                ))
            );
        return sb.toString();
    }

    // ── Project Report ───────────────────────────────────────

    private String projects() {
        StringBuilder sb = new StringBuilder();
        sb.append("Code,Name,Status,Priority,Manager,Members,Start Date,End Date,Budget,Tech Stack,Repo URL\n");
        projectRepo.findAllWithFilters(null, null, "",
                org.springframework.data.domain.PageRequest.of(0, 10000))
            .stream().forEach(p ->
                sb.append(row(
                    p.getCode(), p.getName(),
                    p.getStatus() != null ? p.getStatus().name() : "",
                    p.getPriority() != null ? p.getPriority().name() : "",
                    p.getManager() != null ? p.getManager().getFullName() : "",
                    p.getMembers() != null ? String.valueOf(p.getMembers().size()) : "0",
                    p.getStartDate() != null ? p.getStartDate().toString() : "",
                    p.getEndDate()   != null ? p.getEndDate().toString()   : "",
                    p.getBudget()    != null ? p.getBudget().toString()     : "",
                    p.getTechStack(), p.getRepositoryUrl()
                ))
            );
        return sb.toString();
    }

    // ── Leave Report ─────────────────────────────────────────

    private String leaves(LocalDate from, LocalDate to) {
        StringBuilder sb = new StringBuilder();
        sb.append("Employee,Employee ID,Department,Leave Type,Start Date,End Date,Days,Half Day,Status,Reason,Reviewer\n");
        leaveRepo.findByStartDateBetweenAndDeletedFalse(from, to).forEach(l ->
            sb.append(row(
                l.getUser() != null ? l.getUser().getFullName() : "",
                l.getUser() != null ? l.getUser().getEmployeeId() : "",
                l.getUser() != null && l.getUser().getDepartment() != null ? l.getUser().getDepartment().getName() : "",
                l.getLeaveType(),
                l.getStartDate().toString(), l.getEndDate().toString(),
                String.valueOf(l.getTotalDays()), yesNo(l.isHalfDay()),
                l.getStatus(), l.getReason(),
                l.getReviewedBy() != null ? l.getReviewedBy().getFullName() : ""
            ))
        );
        return sb.toString();
    }

    // ── Internship Report ────────────────────────────────────

    private String internship() {
        StringBuilder sb = new StringBuilder();
        sb.append("Employee ID,Full Name,Email,Department,Job Title,Date of Joining,Active\n");
        userRepo.findByRoleAndDeletedFalse(Role.INTERN).forEach(u ->
            sb.append(row(
                u.getEmployeeId(), u.getFullName(), u.getEmail(),
                u.getDepartment() != null ? u.getDepartment().getName() : "",
                u.getJobTitle(),
                u.getDateOfJoining() != null ? u.getDateOfJoining().toString() : "",
                yesNo(u.isActive())
            ))
        );
        return sb.toString();
    }

    // ── Department Report ────────────────────────────────────

    private String departments() {
        StringBuilder sb = new StringBuilder();
        sb.append("Department Name,Code,Manager,Employee Count,Active\n");
        departmentRepo.findByDeletedFalse().forEach(d ->
            sb.append(row(
                d.getName(), d.getCode(),
                d.getManager() != null ? d.getManager().getFullName() : "",
                d.getEmployees() != null ? String.valueOf(d.getEmployees().size()) : "0",
                yesNo(d.isActive())
            ))
        );
        return sb.toString();
    }

    // ── Performance Report ───────────────────────────────────

    private String performance() {
        StringBuilder sb = new StringBuilder();
        sb.append("Employee,Role,Department,Total Tasks,Completed,Pending,Overdue,Completion Rate%\n");
        List<User> users = userRepo.findByDeletedFalseOrderByCreatedAtDesc();
        for (User u : users) {
            long total     = taskRepo.countByAssigneeIdAndDeletedFalse(u.getId());
            long completed = taskRepo.countByAssigneeIdAndStatusAndDeletedFalse(u.getId(),
                com.syntaxcore.workforce.enums.TaskStatus.COMPLETED);
            long pending   = taskRepo.countByAssigneeIdAndStatusAndDeletedFalse(u.getId(),
                com.syntaxcore.workforce.enums.TaskStatus.PENDING);
            long overdue   = taskRepo.countOverdueByAssigneeId(u.getId());
            double rate    = total > 0 ? (completed * 100.0 / total) : 0;
            sb.append(row(
                u.getFullName(),
                u.getRole() != null ? u.getRole().getDisplayName() : "",
                u.getDepartment() != null ? u.getDepartment().getName() : "",
                String.valueOf(total), String.valueOf(completed),
                String.valueOf(pending), String.valueOf(overdue),
                String.format("%.1f", rate)
            ));
        }
        return sb.toString();
    }

    // ── Payroll Summary ──────────────────────────────────────

    private String payroll(LocalDate from, LocalDate to) {
        StringBuilder sb = new StringBuilder();
        sb.append("Employee ID,Full Name,Role,Department,Days Present,Total Hours Worked,Avg Hours/Day\n");
        List<User> users = userRepo.findByDeletedFalseOrderByCreatedAtDesc();
        for (User u : users) {
            List<Attendance> att = attendanceRepo.findByUserIdAndDateBetween(u.getId(), from, to);
            long present    = att.stream().filter(a -> "PRESENT".equals(a.getStatus()) || "LATE".equals(a.getStatus())).count();
            double totalHrs = att.stream().filter(a -> a.getTotalHours() != null).mapToDouble(Attendance::getTotalHours).sum();
            double avgHrs   = present > 0 ? totalHrs / present : 0;
            sb.append(row(
                u.getEmployeeId(), u.getFullName(),
                u.getRole() != null ? u.getRole().getDisplayName() : "",
                u.getDepartment() != null ? u.getDepartment().getName() : "",
                String.valueOf(present),
                String.format("%.2f", totalHrs), String.format("%.2f", avgHrs)
            ));
        }
        return sb.toString();
    }

    // ── Generic fallback ─────────────────────────────────────

    private String generic(String type, LocalDate from, LocalDate to) {
        return "\"Report Type\",\"Date From\",\"Date To\",\"Generated At\"\n"
             + "\"" + type + "\",\"" + from + "\",\"" + to + "\",\"" + java.time.LocalDateTime.now() + "\"\n";
    }

    // ── Helpers ──────────────────────────────────────────────

    private String row(String... vals) {
        return Arrays.stream(vals)
            .map(v -> v == null ? "" : "\"" + v.replace("\"", "\"\"") + "\"")
            .collect(Collectors.joining(",")) + "\n";
    }

    private String yesNo(boolean b) { return b ? "Yes" : "No"; }

    private byte[] addBom(String csv) {
        byte[] bom  = {(byte)0xEF, (byte)0xBB, (byte)0xBF};
        byte[] data = csv.getBytes(StandardCharsets.UTF_8);
        byte[] out  = new byte[bom.length + data.length];
        System.arraycopy(bom, 0, out, 0, bom.length);
        System.arraycopy(data, 0, out, bom.length, data.length);
        return out;
    }
}
