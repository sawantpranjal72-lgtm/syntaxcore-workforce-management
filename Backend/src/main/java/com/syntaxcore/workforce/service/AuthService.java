package com.syntaxcore.workforce.service;

import com.syntaxcore.workforce.dto.request.LoginRequest;
import com.syntaxcore.workforce.dto.request.RegisterRequest;
import com.syntaxcore.workforce.dto.response.AuthResponse;
import jakarta.servlet.http.HttpServletRequest;

public interface AuthService {
    AuthResponse login(LoginRequest request, HttpServletRequest httpRequest);
    AuthResponse register(RegisterRequest request, HttpServletRequest httpRequest);
    AuthResponse refreshToken(String token);
    void logout(String userEmail);
    void forgotPasswordSendOtp(String identifier);
    String verifyForgotPasswordOtp(String phone, String otpCode);
    void resetPasswordWithToken(String verifyToken, String newPassword);
    void changePassword(String userEmail, String currentPassword, String newPassword);
}
