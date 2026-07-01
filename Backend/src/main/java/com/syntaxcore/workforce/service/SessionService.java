package com.syntaxcore.workforce.service;

import com.syntaxcore.workforce.entity.User;
import com.syntaxcore.workforce.entity.UserSession;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.UUID;

public interface SessionService {
    UserSession createSession(User user, String sessionToken, HttpServletRequest request);
    void updateLastActivity(String sessionToken);
    void revokeSession(UUID sessionId);
    void revokeAllUserSessions(UUID userId);
    List<UserSession> getActiveSessions(UUID userId);
    boolean isSessionValid(String sessionToken);
    long getActiveSessionCount(UUID userId);
}
