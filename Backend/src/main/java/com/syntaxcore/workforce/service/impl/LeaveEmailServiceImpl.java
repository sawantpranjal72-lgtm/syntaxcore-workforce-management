package com.syntaxcore.workforce.service.impl;

import com.syntaxcore.workforce.entity.LeaveEmailConfig;
import com.syntaxcore.workforce.entity.LeaveRequest;
import com.syntaxcore.workforce.repository.LeaveEmailConfigRepository;
import com.syntaxcore.workforce.repository.LeaveRepository;
import com.syntaxcore.workforce.service.LeaveEmailService;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeaveEmailServiceImpl implements LeaveEmailService {

    private final LeaveEmailConfigRepository configRepo;
    private final LeaveRepository leaveRepository;
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@syntaxcore.com}")
    private String mailFrom;

    @Value("${app.frontend-url:http://localhost:4200}")
    private String frontendUrl;

    @Value("${app.backend-url:http://localhost:8080}")
    private String backendUrl;

    private static final String APP_NAME = "SyntaxCore WMS";

    // ──────────────────────────────────────────────────────────
    //  Leave raised → notify configured HR recipients
    // ──────────────────────────────────────────────────────────
    @Override
    @Async
    public void notifyLeaveRaised(LeaveRequest leave) {
        List<LeaveEmailConfig> recipients = configRepo.findByActiveTrueAndDeletedFalse();
        if (recipients.isEmpty()) {
            log.info("No leave email recipients configured. Skipping notification.");
            return;
        }

        // Generate a fresh single-use token for this leave request.
        // Valid for 7 days. Cleared on first use or when decided via the web app.
        String token = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        leave.setEmailActionToken(token);
        leave.setEmailActionExpiresAt(LocalDateTime.now().plusDays(7));
        leaveRepository.save(leave);

        String employeeName  = leave.getUser() != null ? leave.getUser().getFullName() : "An employee";
        String employeeEmail = leave.getUser() != null ? leave.getUser().getEmail() : "";
        String leaveType     = leave.getLeaveType() != null ? leave.getLeaveType().replace("_", " ") : "Leave";
        String dateRange     = leave.getStartDate() + " to " + leave.getEndDate();
        int    days          = leave.getTotalDays();
        String reason        = (leave.getReason() != null && !leave.getReason().isBlank()) ? leave.getReason() : "Not provided";

        String approveUrl = backendUrl + "/api/v1/leaves/action?token=" + token + "&action=approve";
        String rejectUrl  = backendUrl + "/api/v1/leaves/action?token=" + token + "&action=reject";
        String appUrl     = frontendUrl + "/leaves";

        String subject = "[" + APP_NAME + "] Leave Request – " + employeeName + " (" + leaveType + ", " + days + " day" + (days != 1 ? "s" : "") + ")";
        String html = buildLeaveRaisedEmail(employeeName, employeeEmail, leaveType, dateRange, days, reason, approveUrl, rejectUrl, appUrl);

        for (LeaveEmailConfig cfg : recipients) {
            if (cfg.getLeaveTypes() != null && !cfg.getLeaveTypes().isBlank()) {
                boolean matches = Arrays.stream(cfg.getLeaveTypes().split(","))
                    .map(String::trim)
                    .anyMatch(t -> t.equalsIgnoreCase(leave.getLeaveType()));
                if (!matches) continue;
            }
            sendHtml(cfg.getEmail(), subject, html);
        }
    }

    // ──────────────────────────────────────────────────────────
    //  Leave decided (approved / rejected) → notify employee
    // ──────────────────────────────────────────────────────────
    @Override
    @Async
    public void notifyLeaveDecision(LeaveRequest leave, boolean approved) {
        if (leave.getUser() == null || leave.getUser().getEmail() == null) return;

        String employeeName = leave.getUser().getFullName();
        String leaveType    = leave.getLeaveType() != null ? leave.getLeaveType().replace("_", " ") : "Leave";
        String dateRange    = leave.getStartDate() + " to " + leave.getEndDate();
        int    days         = leave.getTotalDays();
        String reviewerName = leave.getReviewedBy() != null ? leave.getReviewedBy().getFullName() : "HR";
        String comment      = (leave.getReviewComment() != null && !leave.getReviewComment().isBlank())
                              ? leave.getReviewComment() : "No comments provided.";
        String appUrl       = frontendUrl + "/leaves";

        String subject = "[" + APP_NAME + "] Your Leave Request has been " + (approved ? "Approved ✅" : "Rejected ❌");
        String html = buildDecisionEmail(employeeName, leaveType, dateRange, days, reviewerName, comment, approved, appUrl);
        sendHtml(leave.getUser().getEmail(), subject, html);
    }

    // ──────────────────────────────────────────────────────────
    //  HTML builders
    // ──────────────────────────────────────────────────────────

    private String buildLeaveRaisedEmail(String name, String email, String type,
            String dates, int days, String reason,
            String approveUrl, String rejectUrl, String appUrl) {
        return emailShell(
            "📋 Leave Request Pending Approval",
            "<p style='color:#374151;font-size:15px;margin:0 0 20px'>A new leave request has been submitted and requires your review.</p>"
            + detailsTable(new String[][]{
                {"Employee",   name + " (" + email + ")"},
                {"Leave Type", type},
                {"Dates",      dates},
                {"Total Days", days + " day" + (days != 1 ? "s" : "")},
                {"Reason",     reason},
                {"Status",     "<span style='color:#d97706;font-weight:600'>PENDING – Awaiting Approval</span>"},
              })
            + "<p style='font-size:14px;color:#6b7280;margin:24px 0 8px'>You can approve or reject this request directly from this email:</p>"
            + "<div style='display:flex;gap:12px;margin-bottom:28px'>"
            + actionBtn(approveUrl, "✅ Approve Leave", "#10b981")
            + "&nbsp;&nbsp;"
            + actionBtn(rejectUrl,  "❌ Reject Leave",  "#ef4444")
            + "</div>"
            + "<p style='font-size:12px;color:#9ca3af;margin:0'>Or <a href='" + appUrl + "' style='color:#6366f1'>open SyntaxCore WMS</a> to manage leave requests with comments."
            + "<br>These buttons work once — the link expires in 7 days and is invalidated after first use.</p>"
        );
    }

    private String buildDecisionEmail(String name, String type, String dates,
            int days, String reviewer, String comment, boolean approved, String appUrl) {
        String color   = approved ? "#10b981" : "#ef4444";
        String decision = approved ? "APPROVED" : "REJECTED";
        String advice   = approved
            ? "Your leave has been approved. Please ensure your responsibilities are covered during your absence."
            : "Your leave request was not approved. Please contact your manager or HR for further discussion.";
        return emailShell(
            (approved ? "✅" : "❌") + " Your Leave has been " + decision,
            "<p style='color:#374151;font-size:15px;margin:0 0 20px'>Your leave request has been reviewed.</p>"
            + "<div style='background:" + (approved ? "#f0fdf4" : "#fef2f2") + ";border:1px solid "
            + (approved ? "#bbf7d0" : "#fecaca") + ";border-radius:10px;padding:14px 18px;margin:0 0 20px'>"
            + "<p style='font-size:18px;font-weight:700;color:" + color + ";margin:0'>Decision: " + decision + "</p></div>"
            + detailsTable(new String[][]{
                {"Leave Type",  type},
                {"Dates",       dates},
                {"Total Days",  days + " day" + (days != 1 ? "s" : "")},
                {"Reviewed By", reviewer},
                {"Comments",    comment},
              })
            + "<p style='color:#374151;font-size:14px;margin:20px 0 24px'>" + advice + "</p>"
            + actionBtn(appUrl, "View in SyntaxCore WMS", "#6366f1")
        );
    }

    private String detailsTable(String[][] rows) {
        StringBuilder sb = new StringBuilder(
            "<table style='width:100%;border-collapse:collapse;margin:0 0 24px'>");
        for (String[] row : rows) {
            sb.append("<tr>"
                + "<td style='padding:8px 12px;font-size:13px;font-weight:600;color:#6b7280;white-space:nowrap;width:120px;border-bottom:1px solid #f3f4f6'>")
                .append(row[0])
                .append("</td><td style='padding:8px 12px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6'>")
                .append(row[1])
                .append("</td></tr>");
        }
        sb.append("</table>");
        return sb.toString();
    }

    private String actionBtn(String url, String label, String color) {
        return "<a href='" + url + "' style='display:inline-block;padding:12px 24px;background:" + color
            + ";color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px'>"
            + label + "</a>";
    }

    private String emailShell(String heading, String body) {
        return "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'>"
            + "<meta name='viewport' content='width=device-width,initial-scale=1'></head>"
            + "<body style='margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif'>"
            + "<table role='presentation' width='100%' cellpadding='0' cellspacing='0'><tr><td style='padding:32px 16px'>"
            + "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='max-width:600px;margin:0 auto'>"
            // Header
            + "<tr><td style='background:linear-gradient(135deg,#6366f1,#4f46e5);padding:24px 32px;border-radius:14px 14px 0 0'>"
            + "<p style='margin:0;font-size:12px;font-weight:600;color:rgba(255,255,255,.7);letter-spacing:.1em'>SYNTAXCORE WMS</p>"
            + "<h1 style='margin:6px 0 0;font-size:22px;font-weight:800;color:#fff'>" + heading + "</h1>"
            + "</td></tr>"
            // Body
            + "<tr><td style='background:#fff;padding:32px;border-radius:0 0 14px 14px;box-shadow:0 4px 24px rgba(0,0,0,.06)'>"
            + body
            + "<hr style='border:none;border-top:1px solid #f3f4f6;margin:24px 0'>"
            + "<p style='margin:0;font-size:12px;color:#9ca3af'>This is an automated notification from SyntaxCore WMS. "
            + "The approve/reject buttons above are single-use and expire in 7 days.</p>"
            + "</td></tr></table></td></tr></table>"
            + "</body></html>";
    }

    // ──────────────────────────────────────────────────────────
    //  Utility: send HTML email
    // ──────────────────────────────────────────────────────────
    private void sendHtml(String to, String subject, String html) {
        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, false, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true); // true = HTML
            mailSender.send(mime);
            log.info("Leave email sent to {}: {}", to, subject);
        } catch (Exception e) {
            log.error("Failed to send leave email to {}: {}", to, e.getMessage());
        }
    }
}
