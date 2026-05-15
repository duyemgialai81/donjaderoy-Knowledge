package com.example.server.service;

public interface EmailService {
    void sendOtpEmail(String to, String subject, String title, String otpCode, String expiryText);
}
