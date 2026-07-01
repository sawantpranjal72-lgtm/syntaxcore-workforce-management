package com.syntaxcore.workforce.service.impl;

import com.syntaxcore.workforce.entity.OtpRecord;
import com.syntaxcore.workforce.exception.BusinessException;
import com.syntaxcore.workforce.repository.OtpRepository;
import com.syntaxcore.workforce.service.OtpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OtpServiceImpl implements OtpService {

    private final OtpRepository otpRepository;
    private final JavaMailSender mailSender;

    @Value("${app.otp.expiry-minutes:10}")
    private int otpExpiryMinutes;

    @Value("${app.otp.max-attempts:3}")
    private int maxAttempts;

    @Value("${twilio.account-sid:}")
    private String twilioSid;

    @Value("${twilio.auth-token:}")
    private String twilioToken;

    @Value("${twilio.from-number:}")
    private String twilioFrom;

    @Value("${spring.mail.username:noreply@syntaxcore.com}")
    private String mailFrom;

    private final SecureRandom random = new SecureRandom();

    @Override
    public void sendOtpToPhone(String phone, String purpose) {
        // Invalidate any existing OTPs for this phone+purpose
        otpRepository.invalidateAllForPhone(phone, purpose);

        String otpCode = generateOtp();

        OtpRecord record = OtpRecord.builder()
            .phone(phone)
            .otpCode(otpCode)
            .purpose(purpose)
            .expiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes))
            .build();
        otpRepository.save(record);

        // Send via SMS (Twilio) or fallback to log in dev
        boolean smsSent = sendSms(phone, buildSmsMessage(otpCode, purpose));
        if (!smsSent) {
            log.warn("SMS not sent (Twilio not configured). OTP for {} [{}]: {}", phone, purpose, otpCode);
        }
    }

    @Override
    public void sendOtpToEmail(String email, String phone, String purpose) {
        otpRepository.invalidateAllForPhone(phone, purpose);

        String otpCode = generateOtp();

        OtpRecord record = OtpRecord.builder()
            .phone(phone)
            .email(email)
            .otpCode(otpCode)
            .purpose(purpose)
            .expiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes))
            .build();
        otpRepository.save(record);

        sendEmail(email, otpCode, purpose);
        boolean smsSent = sendSms(phone, buildSmsMessage(otpCode, purpose));
        log.info("OTP sent to email={} phone={} [{}] smsSent={}", email, phone, purpose, smsSent);
    }

    @Override
    public String verifyOtp(String phone, String otpCode, String purpose) {
        // Try phone lookup first, then email lookup (for users without phone numbers)
        OtpRecord record = otpRepository
            .findTopByPhoneAndPurposeAndVerifiedFalseAndUsedFalseOrderByCreatedAtDesc(phone, purpose)
            .or(() -> otpRepository.findTopByEmailAndPurposeAndVerifiedFalseAndUsedFalseOrderByCreatedAtDesc(phone, purpose))
            .orElseThrow(() -> new BusinessException("No active OTP found. Please request a new one."));

        if (record.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException("OTP has expired. Please request a new one.");
        }

        if (record.getAttempts() >= maxAttempts) {
            record.setUsed(true);
            otpRepository.save(record);
            throw new BusinessException("Too many failed attempts. Please request a new OTP.");
        }

        if (!record.getOtpCode().equals(otpCode)) {
            record.setAttempts(record.getAttempts() + 1);
            otpRepository.save(record);
            int remaining = maxAttempts - record.getAttempts();
            throw new BusinessException("Invalid OTP. " + remaining + " attempts remaining.");
        }

        // Mark verified and issue a short-lived token
        record.setVerified(true);
        String verifyToken = UUID.randomUUID().toString();
        record.setToken(verifyToken);
        otpRepository.save(record);

        return verifyToken;
    }

    @Override
    public void consumeVerifyToken(String token) {
        OtpRecord record = otpRepository.findByTokenAndUsedFalse(token)
            .orElseThrow(() -> new BusinessException("Invalid or expired verification token."));

        if (record.getExpiresAt().plusMinutes(5).isBefore(LocalDateTime.now())) {
            throw new BusinessException("Verification token has expired.");
        }

        record.setUsed(true);
        otpRepository.save(record);
    }

    @Override
    public boolean isTokenValid(String token) {
        return otpRepository.findByTokenAndUsedFalse(token)
            .map(r -> r.isVerified() && r.getExpiresAt().plusMinutes(15).isAfter(LocalDateTime.now()))
            .orElse(false);
    }

    // ── Scheduled cleanup ────────────────────────────────────
    @Scheduled(fixedDelay = 3_600_000) // every hour
    public void cleanExpiredOtps() {
        otpRepository.deleteExpired(LocalDateTime.now().minusHours(1));
        log.debug("Expired OTP records cleaned up");
    }

    // ── Private helpers ──────────────────────────────────────
    private String generateOtp() {
        return String.format("%06d", random.nextInt(1_000_000));
    }

    private String buildSmsMessage(String code, String purpose) {
        return switch (purpose) {
            case "FORGOT_PASSWORD" -> "SyntaxCore WMS: Your password reset OTP is " + code + ". Valid for " + otpExpiryMinutes + " minutes. Do not share with anyone.";
            case "PHONE_VERIFY"    -> "SyntaxCore WMS: Your phone verification OTP is " + code + ". Valid for " + otpExpiryMinutes + " minutes.";
            case "LOGIN_2FA"       -> "SyntaxCore WMS: Your login verification OTP is " + code + ". Valid for " + otpExpiryMinutes + " minutes.";
            default                -> "SyntaxCore WMS: Your OTP is " + code + ". Valid for " + otpExpiryMinutes + " minutes.";
        };
    }

    private boolean sendSms(String phone, String message) {
        if (twilioSid == null || twilioSid.isBlank()) {
            log.debug("Twilio not configured — SMS skipped");
            return false;
        }
        try {
            // Twilio REST API call
            String url = "https://api.twilio.com/2010-04-01/Accounts/" + twilioSid + "/Messages.json";
            String body = "To=" + encode(phone) + "&From=" + encode(twilioFrom) + "&Body=" + encode(message);

            java.net.URL apiUrl = new java.net.URL(url);
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) apiUrl.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);

            String auth = twilioSid + ":" + twilioToken;
            String encoded = java.util.Base64.getEncoder().encodeToString(auth.getBytes());
            conn.setRequestProperty("Authorization", "Basic " + encoded);
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

            try (java.io.OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes());
            }

            int code = conn.getResponseCode();
            log.info("Twilio SMS to {} — HTTP {}", phone, code);
            return code == 200 || code == 201;
        } catch (Exception e) {
            log.error("Failed to send SMS via Twilio: {}", e.getMessage());
            return false;
        }
    }

    private void sendEmail(String email, String otpCode, String purpose) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(mailFrom);
            msg.setTo(email);
            msg.setSubject("SyntaxCore WMS — Your OTP Code");
            msg.setText(
                "Hello,\n\n" +
                "Your OTP for " + purpose.replace("_", " ") + " is:\n\n" +
                "  " + otpCode + "\n\n" +
                "This OTP is valid for " + otpExpiryMinutes + " minutes.\n" +
                "Do NOT share this with anyone.\n\n" +
                "If you did not request this, please ignore this email.\n\n" +
                "— SyntaxCore WMS Security Team"
            );
            mailSender.send(msg);
            log.info("OTP email sent to {}", email);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", email, e.getMessage());
        }
    }

    private String encode(String value) {
        try { return java.net.URLEncoder.encode(value, "UTF-8"); }
        catch (Exception e) { return value; }
    }
}
