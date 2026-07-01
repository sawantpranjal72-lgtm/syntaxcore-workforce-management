package com.syntaxcore.workforce.service;

public interface OtpService {
    void sendOtpToPhone(String phone, String purpose);
    void sendOtpToEmail(String email, String phone, String purpose);
    String verifyOtp(String phone, String otpCode, String purpose);
    void consumeVerifyToken(String token);
    boolean isTokenValid(String token);
}
