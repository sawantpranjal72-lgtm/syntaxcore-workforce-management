package com.syntaxcore.workforce.service.impl;

import com.syntaxcore.workforce.entity.User;
import com.syntaxcore.workforce.entity.UserSession;
import com.syntaxcore.workforce.exception.BusinessException;
import com.syntaxcore.workforce.repository.UserSessionRepository;
import com.syntaxcore.workforce.service.SessionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SessionServiceImpl implements SessionService {

    private final UserSessionRepository sessionRepository;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpirationMs;

    @Override
    public UserSession createSession(User user, String sessionToken, HttpServletRequest request) {
        String ip        = extractIp(request);
        String userAgent = request.getHeader("User-Agent");
        String device    = detectDevice(userAgent);

        UserSession session = UserSession.builder()
            .user(user)
            .sessionToken(sessionToken)
            .ipAddress(ip)
            .userAgent(userAgent)
            .deviceType(device)
            .active(true)
            .expiresAt(LocalDateTime.now().plusSeconds(jwtExpirationMs / 1000))
            .build();

        log.info("Session created for user={} ip={} device={}", user.getEmail(), ip, device);
        return sessionRepository.save(session);
    }

    @Override
    public void updateLastActivity(String sessionToken) {
        sessionRepository.findBySessionTokenAndActiveTrue(sessionToken).ifPresent(s -> {
            s.setLastActivity(LocalDateTime.now());
            sessionRepository.save(s);
        });
    }

    @Override
    public void revokeSession(UUID sessionId) {
        sessionRepository.revokeById(sessionId, LocalDateTime.now());
    }

    @Override
    public void revokeAllUserSessions(UUID userId) {
        sessionRepository.revokeAllForUser(userId, LocalDateTime.now());
        log.info("All sessions revoked for userId={}", userId);
    }

    @Override
    public List<UserSession> getActiveSessions(UUID userId) {
        return sessionRepository.findByUserIdAndActiveTrueOrderByLastActivityDesc(userId);
    }

    @Override
    public boolean isSessionValid(String sessionToken) {
        return sessionRepository.findBySessionTokenAndActiveTrue(sessionToken)
            .map(s -> s.getExpiresAt().isAfter(LocalDateTime.now()))
            .orElse(false);
    }

    @Override
    public long getActiveSessionCount(UUID userId) {
        return sessionRepository.countByUserIdAndActiveTrue(userId);
    }

    @Scheduled(fixedDelay = 1_800_000) // every 30 minutes
    public void cleanExpiredSessions() {
        sessionRepository.expireOldSessions(LocalDateTime.now());
        log.debug("Expired sessions cleaned up");
    }

    private String extractIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) return realIp;
        return request.getRemoteAddr();
    }

    private String detectDevice(String userAgent) {
        if (userAgent == null) return "UNKNOWN";
        String ua = userAgent.toLowerCase();
        if (ua.contains("mobile") || ua.contains("android") || ua.contains("iphone")) return "MOBILE";
        if (ua.contains("tablet") || ua.contains("ipad")) return "TABLET";
        return "WEB";
    }
}
