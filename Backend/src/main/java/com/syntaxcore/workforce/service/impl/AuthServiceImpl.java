package com.syntaxcore.workforce.service.impl;

import com.syntaxcore.workforce.dto.request.LoginRequest;
import com.syntaxcore.workforce.dto.request.RegisterRequest;
import com.syntaxcore.workforce.dto.response.AuthResponse;
import com.syntaxcore.workforce.dto.response.UserSummaryResponse;
import com.syntaxcore.workforce.entity.RefreshToken;
import com.syntaxcore.workforce.entity.User;
import com.syntaxcore.workforce.exception.BusinessException;
import com.syntaxcore.workforce.exception.ResourceNotFoundException;
import com.syntaxcore.workforce.repository.DepartmentRepository;
import com.syntaxcore.workforce.repository.OtpRepository;
import com.syntaxcore.workforce.repository.RefreshTokenRepository;
import com.syntaxcore.workforce.repository.UserRepository;
import com.syntaxcore.workforce.security.JwtTokenProvider;
import com.syntaxcore.workforce.service.AuthService;
import com.syntaxcore.workforce.service.OtpService;
import com.syntaxcore.workforce.service.SessionService;
import com.syntaxcore.workforce.util.UserMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OtpRepository otpRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;
    private final OtpService otpService;
    private final SessionService sessionService;

    @Value("${jwt.refresh-token.expiration}")
    private long refreshTokenExpiration;
    @Value("${jwt.expiration}")
    private long jwtExpiration;

    @Override
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String email = normalizeEmail(request.getEmail());
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(email, request.getPassword()));

        User user = userRepository.findByEmailIgnoreCaseAndDeletedFalse(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", email));

        if (!user.isActive())
            throw new BusinessException("Account is deactivated. Please contact HR.");

        // ── Single-session enforcement ──────────────────────────────────
        long activeSessions = sessionService.getActiveSessionCount(user.getId());

        if (activeSessions > 0 && !request.isForceNewSession() && !request.isContinueExistingSession()) {
            // Return challenge response – no token issued yet
            return AuthResponse.builder()
                .hasActiveSession(true)
                .activeSessionCount((int) activeSessions)
                .user(userMapper.toSummaryResponse(user))
                .build();
        }

        if (request.isForceNewSession()) {
            // Revoke all existing sessions so only this new one is active
            sessionService.revokeAllUserSessions(user.getId());
            refreshTokenRepository.revokeAllUserTokens(user.getId());
        }
        // If continueExistingSession=true, we just create an additional token without revoking

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String accessToken  = jwtTokenProvider.generateToken(user);
        String refreshToken = createRefreshToken(user);
        if (httpRequest != null) sessionService.createSession(user, accessToken, httpRequest);

        return buildAuthResponse(accessToken, refreshToken, user);
    }

    @Override
    public AuthResponse register(RegisterRequest request, HttpServletRequest httpRequest) {
        String email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmailIgnoreCaseAndDeletedFalse(email))
            throw new BusinessException("Email already registered: " + email);

        if (request.getPassword() == null || request.getPassword().isBlank())
            throw new BusinessException("Password is required for registration");
        if (request.getRole() == null)
            throw new BusinessException("Role is required for registration");

        User user = User.builder()
            .firstName(request.getFirstName()).lastName(request.getLastName())
            .email(email).password(passwordEncoder.encode(request.getPassword()))
            .role(request.getRole()).phone(request.getPhone()).jobTitle(request.getJobTitle())
            .dateOfJoining(request.getDateOfJoining()).employeeId(generateEmployeeId())
            .emailVerified(false).active(true).build();

        if (request.getDepartmentId() != null)
            departmentRepository.findById(request.getDepartmentId()).ifPresent(user::setDepartment);

        User saved = userRepository.save(user);
        String accessToken  = jwtTokenProvider.generateToken(saved);
        String refreshToken = createRefreshToken(saved);
        if (httpRequest != null) sessionService.createSession(saved, accessToken, httpRequest);

        return buildAuthResponse(accessToken, refreshToken, saved);
    }

    @Override
    public AuthResponse refreshToken(String token) {
        RefreshToken rt = refreshTokenRepository.findByToken(token)
            .orElseThrow(() -> new BusinessException("Invalid refresh token"));
        if (rt.isRevoked() || rt.getExpiryDate().isBefore(Instant.now()))
            throw new BusinessException("Refresh token expired. Please login again.");

        User user = rt.getUser();
        rt.setRevoked(true);
        refreshTokenRepository.save(rt);

        return buildAuthResponse(jwtTokenProvider.generateToken(user), createRefreshToken(user), user);
    }

    @Override
    public void logout(String userEmail) {
        userRepository.findByEmailIgnoreCaseAndDeletedFalse(userEmail).ifPresent(u -> {
            refreshTokenRepository.revokeAllUserTokens(u.getId());
            sessionService.revokeAllUserSessions(u.getId());
        });
    }

    @Override
    public void forgotPasswordSendOtp(String identifier) {
        User user;
        if (identifier.contains("@")) {
            String email = normalizeEmail(identifier);
            user = userRepository.findByEmailIgnoreCaseAndDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException("No account with email: " + identifier));
        } else {
            user = userRepository.findByPhoneAndDeletedFalse(identifier)
                .orElseThrow(() -> new ResourceNotFoundException("No account with phone: " + identifier));
        }

        String phone = user.getPhone();
        // If user has no phone number, use email as the "phone" key for OTP lookup
        String otpKey = (phone == null || phone.isBlank()) ? user.getEmail() : phone;

        // Always send OTP to email — phone is optional (SMS via Twilio if configured)
        otpService.sendOtpToEmail(user.getEmail(), otpKey, "FORGOT_PASSWORD");

        log.info("Forgot-password OTP sent for user={} via email. OTP key={}", user.getEmail(), otpKey);
    }

    /**
     * Verify OTP — phone param is actually the "otpKey" which may be email if user has no phone
     */

    @Override
    public String verifyForgotPasswordOtp(String identifier, String otpCode) {
        // identifier can be phone OR email (used as OTP key when no phone)
        // First try as-is, then try looking up by email to get the real key
        try {
            return otpService.verifyOtp(identifier, otpCode, "FORGOT_PASSWORD");
        } catch (Exception e) {
            // Fallback: look up user by email and use email as key
            if (identifier.contains("@")) {
                return otpService.verifyOtp(identifier, otpCode, "FORGOT_PASSWORD");
            }
            throw e;
        }
    }

    @Override
    public void resetPasswordWithToken(String verifyToken, String newPassword) {
        if (otpService.isTokenValid(verifyToken)) {
            otpRepository.findByTokenAndUsedFalse(verifyToken).ifPresent(otp -> {
                // Try phone first, then email (for users without phone)
                User targetUser = null;
                if (otp.getPhone() != null && !otp.getPhone().isBlank()) {
                    targetUser = userRepository.findByPhoneAndDeletedFalse(otp.getPhone()).orElse(null);
                }
                if (targetUser == null && otp.getEmail() != null) {
                    targetUser = userRepository.findByEmailIgnoreCaseAndDeletedFalse(otp.getEmail()).orElse(null);
                }
                // Also try treating phone field as email key
                if (targetUser == null && otp.getPhone() != null && otp.getPhone().contains("@")) {
                    targetUser = userRepository.findByEmailIgnoreCaseAndDeletedFalse(otp.getPhone()).orElse(null);
                }
                if (targetUser != null) {
                    targetUser.setPassword(passwordEncoder.encode(newPassword));
                    userRepository.save(targetUser);
                    log.info("Password reset via OTP for user={}", targetUser.getEmail());
                }
                otpService.consumeVerifyToken(verifyToken);
            });
            return;
        }
        User user = userRepository.findByPasswordResetToken(verifyToken)
            .orElseThrow(() -> new BusinessException("Invalid or expired reset token"));
        if (user.getPasswordResetTokenExpiry().isBefore(LocalDateTime.now()))
            throw new BusinessException("Password reset token has expired");
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        userRepository.save(user);
    }

    @Override
    public void changePassword(String userEmail, String currentPassword, String newPassword) {
        User user = userRepository.findByEmailIgnoreCaseAndDeletedFalse(userEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));
        if (!passwordEncoder.matches(currentPassword, user.getPassword()))
            throw new BusinessException("Current password is incorrect");
        if (passwordEncoder.matches(newPassword, user.getPassword()))
            throw new BusinessException("New password must differ from current password");
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        refreshTokenRepository.revokeAllUserTokens(user.getId());
        sessionService.revokeAllUserSessions(user.getId());
    }

    private String createRefreshToken(User user) {
        RefreshToken rt = RefreshToken.builder().user(user)
            .token(UUID.randomUUID().toString())
            .expiryDate(Instant.now().plusMillis(refreshTokenExpiration)).revoked(false).build();
        return refreshTokenRepository.save(rt).getToken();
    }

    private AuthResponse buildAuthResponse(String access, String refresh, User user) {
        return AuthResponse.builder().accessToken(access).refreshToken(refresh)
            .tokenType("Bearer").expiresIn(jwtExpiration).user(userMapper.toSummaryResponse(user)).build();
    }

    private String generateEmployeeId() {
        // Use nano-time suffix to avoid duplicates
        long suffix = System.nanoTime() % 90000 + 10000;
        return "SC-" + String.format("%05d", suffix);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
