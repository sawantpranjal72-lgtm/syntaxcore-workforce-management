package com.syntaxcore.workforce.controller;

import com.syntaxcore.workforce.dto.response.LeaveResponse;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import com.syntaxcore.workforce.entity.LeaveRequest;
import com.syntaxcore.workforce.exception.BusinessException;
import com.syntaxcore.workforce.exception.ResourceNotFoundException;
import com.syntaxcore.workforce.repository.LeaveRepository;
import com.syntaxcore.workforce.repository.UserRepository;
import com.syntaxcore.workforce.util.EntityMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import com.syntaxcore.workforce.service.LeaveEmailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/leaves")
@RequiredArgsConstructor
@Tag(name = "Leave Management", description = "Apply, approve, and manage leave requests")
public class LeaveController {

    private final LeaveRepository leaveRepository;
    private final UserRepository userRepository;
    private final EntityMapper entityMapper;
    private final LeaveEmailService leaveEmailService;

    @Value("${app.frontend-url:http://localhost:4200}")
    private String frontendUrl;

    @PostMapping
    @Operation(summary = "Apply for leave")
    public ResponseEntity<LeaveResponse> applyLeave(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body) {

        var user = userRepository.findByEmailIgnoreCaseAndDeletedFalse(userDetails.getUsername())
            .orElseThrow(() -> new ResourceNotFoundException("User", userDetails.getUsername()));

        LocalDate start = LocalDate.parse(body.get("startDate"));
        LocalDate end   = LocalDate.parse(body.get("endDate"));
        if (end.isBefore(start)) throw new BusinessException("End date cannot be before start date");

        int totalDays = (int) ChronoUnit.DAYS.between(start, end) + 1;

        LeaveRequest leave = LeaveRequest.builder()
            .user(user)
            .leaveType(body.get("leaveType"))
            .startDate(start)
            .endDate(end)
            .totalDays(totalDays)
            .reason(body.get("reason"))
            .status("PENDING")
            .halfDay(Boolean.parseBoolean(body.getOrDefault("halfDay", "false")))
            .build();

        LeaveRequest saved = leaveRepository.save(leave);
        leaveEmailService.notifyLeaveRaised(saved);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(entityMapper.toLeaveResponse(saved));
    }

    @GetMapping("/my")
    @Operation(summary = "Get my leave requests")
    public ResponseEntity<PagedResponse<LeaveResponse>> getMyLeaves(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var user = userRepository.findByEmailIgnoreCaseAndDeletedFalse(userDetails.getUsername())
            .orElseThrow(() -> new ResourceNotFoundException("User", userDetails.getUsername()));
        Page<LeaveRequest> leavePage = leaveRepository.findByUserIdAndDeletedFalseOrderByCreatedAtDesc(
            user.getId(), PageRequest.of(page, size));
        return ResponseEntity.ok(PagedResponse.from(leavePage.map(entityMapper::toLeaveResponse)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER','PROJECT_MANAGER')")
    @Operation(summary = "Get all leave requests with filters")
    public ResponseEntity<PagedResponse<LeaveResponse>> getAllLeaves(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<LeaveRequest> leavePage = leaveRepository.findAllWithFilters(
            status, userId, PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(PagedResponse.from(leavePage.map(entityMapper::toLeaveResponse)));
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER','PROJECT_MANAGER')")
    @Operation(summary = "Approve a leave request")
    public ResponseEntity<LeaveResponse> approveLeave(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody(required = false) Map<String, String> body) {
        LeaveRequest leave = leaveRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Leave", id.toString()));
        if (!"PENDING".equals(leave.getStatus()))
            throw new BusinessException("Only PENDING leaves can be approved");

        var reviewer = userRepository.findByEmailIgnoreCaseAndDeletedFalse(userDetails.getUsername()).orElse(null);
        leave.setStatus("APPROVED");
        leave.setReviewedBy(reviewer);
        if (body != null) leave.setReviewComment(body.get("comment"));
        // Invalidate the email action token — the leave is decided, the link should stop working
        leave.setEmailActionToken(null);
        leave.setEmailActionExpiresAt(null);
        LeaveRequest saved = leaveRepository.save(leave);
        leaveEmailService.notifyLeaveDecision(saved, true);
        return ResponseEntity.ok(entityMapper.toLeaveResponse(saved));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER','PROJECT_MANAGER')")
    @Operation(summary = "Reject a leave request")
    public ResponseEntity<LeaveResponse> rejectLeave(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body) {
        LeaveRequest leave = leaveRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Leave", id.toString()));
        if (!"PENDING".equals(leave.getStatus()))
            throw new BusinessException("Only PENDING leaves can be rejected");

        var reviewer = userRepository.findByEmailIgnoreCaseAndDeletedFalse(userDetails.getUsername()).orElse(null);
        leave.setStatus("REJECTED");
        leave.setReviewedBy(reviewer);
        leave.setReviewComment(body.get("comment"));
        // Invalidate the email action token — the leave is decided, the link should stop working
        leave.setEmailActionToken(null);
        leave.setEmailActionExpiresAt(null);
        LeaveRequest saved = leaveRepository.save(leave);
        leaveEmailService.notifyLeaveDecision(saved, false);
        return ResponseEntity.ok(entityMapper.toLeaveResponse(saved));
    }

    @PatchMapping("/{id}/cancel")
    @Operation(summary = "Cancel own leave request")
    public ResponseEntity<LeaveResponse> cancelLeave(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        var user  = userRepository.findByEmailIgnoreCaseAndDeletedFalse(userDetails.getUsername()).orElseThrow();
        LeaveRequest leave = leaveRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Leave", id.toString()));
        if (!leave.getUser().getId().equals(user.getId()))
            throw new BusinessException("You can only cancel your own leave requests");
        if ("APPROVED".equals(leave.getStatus()))
            throw new BusinessException("Cannot cancel an already approved leave");
        leave.setStatus("CANCELLED");
        return ResponseEntity.ok(entityMapper.toLeaveResponse(leaveRepository.save(leave)));
    }

    @GetMapping("/pending-count")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER','PROJECT_MANAGER')")
    @Operation(summary = "Get count of pending leave requests")
    public ResponseEntity<Map<String, Long>> getPendingCount() {
        return ResponseEntity.ok(Map.of("pendingCount", leaveRepository.countByStatusAndDeletedFalse("PENDING")));
    }

    /**
     * Public endpoint — authenticated via the single-use token embedded in
     * the notification email's approve/reject links, not via JWT. The token
     * is generated when the leave-raised email is sent, is valid for 7 days,
     * and is cleared immediately after first use so it can never be replayed.
     *
     * GET /api/v1/leaves/action?token=XXX&action=approve
     * GET /api/v1/leaves/action?token=XXX&action=reject&comment=...
     *
     * Responds with a simple HTML page so the person clicking in their email
     * client sees a clear confirmation rather than raw JSON.
     */
    @GetMapping("/action")
    @Operation(summary = "One-click approve/reject from email link — authenticated by the single-use token embedded in the notification email")
    public ResponseEntity<String> emailAction(
            @RequestParam String token,
            @RequestParam String action,
            @RequestParam(required = false, defaultValue = "") String comment) {

        LeaveRequest leave = leaveRepository.findByEmailActionTokenAndDeletedFalse(token)
            .orElse(null);

        String html;
        if (leave == null) {
            html = emailActionPage("⚠️ Invalid or Expired Link",
                "This link is invalid or has already been used. Please log in to <strong>SyntaxCore WMS</strong> to manage leave requests.",
                "#f59e0b");
            return ResponseEntity.ok().header("Content-Type", "text/html;charset=UTF-8").body(html);
        }

        if (!("PENDING".equals(leave.getStatus()))) {
            html = emailActionPage("ℹ️ Already Decided",
                "This leave request has already been <strong>" + leave.getStatus() + "</strong>. No further action needed.",
                "#6366f1");
            return ResponseEntity.ok().header("Content-Type", "text/html;charset=UTF-8").body(html);
        }

        if (leave.getEmailActionExpiresAt() != null && java.time.LocalDateTime.now().isAfter(leave.getEmailActionExpiresAt())) {
            // Clear expired token
            leave.setEmailActionToken(null);
            leave.setEmailActionExpiresAt(null);
            leaveRepository.save(leave);
            html = emailActionPage("⏰ Link Expired",
                "This email link expired after 7 days. Please log in to <strong>SyntaxCore WMS</strong> to manage this leave request.",
                "#ef4444");
            return ResponseEntity.ok().header("Content-Type", "text/html;charset=UTF-8").body(html);
        }

        boolean approving = "approve".equalsIgnoreCase(action);

        // Clear the token first — single use, cannot be replayed
        leave.setEmailActionToken(null);
        leave.setEmailActionExpiresAt(null);
        leave.setStatus(approving ? "APPROVED" : "REJECTED");
        if (comment != null && !comment.isBlank()) leave.setReviewComment(comment);
        leaveRepository.save(leave);
        leaveEmailService.notifyLeaveDecision(leave, approving);

        String employeeName = leave.getUser() != null ? leave.getUser().getFullName() : "the employee";
        String leaveType = leave.getLeaveType() != null ? leave.getLeaveType().replace("_", " ") : "leave";
        if (approving) {
            html = emailActionPage("✅ Leave Approved",
                "You have <strong>approved</strong> " + employeeName + "'s " + leaveType + " request ("
                + leave.getStartDate() + " – " + leave.getEndDate() + "). "
                + "They have been notified automatically.",
                "#10b981");
        } else {
            html = emailActionPage("❌ Leave Rejected",
                "You have <strong>rejected</strong> " + employeeName + "'s " + leaveType + " request. "
                + "They have been notified automatically.",
                "#ef4444");
        }
        return ResponseEntity.ok().header("Content-Type", "text/html;charset=UTF-8").body(html);
    }

    private String emailActionPage(String heading, String message, String color) {
        return "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'>"
            + "<meta name='viewport' content='width=device-width,initial-scale=1'>"
            + "<title>SyntaxCore WMS</title>"
            + "<style>*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}"
            + "body{background:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}"
            + ".card{background:#fff;border-radius:16px;padding:40px;max-width:480px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}"
            + ".icon{font-size:48px;margin-bottom:16px}"
            + "h1{font-size:22px;font-weight:700;color:#1e293b;margin-bottom:12px}"
            + "p{font-size:15px;color:#64748b;line-height:1.6;margin-bottom:24px}"
            + "a{display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px}"
            + "</style></head><body>"
            + "<div class='card'>"
            + "<div class='icon' style='color:" + color + "'>" + heading.substring(0, 2) + "</div>"
            + "<h1 style='color:" + color + "'>" + heading.substring(2).trim() + "</h1>"
            + "<p>" + message + "</p>"
            + "<a href='" + frontendUrl + "/leaves'>Open SyntaxCore WMS</a>"
            + "</div></body></html>";
    }
}

