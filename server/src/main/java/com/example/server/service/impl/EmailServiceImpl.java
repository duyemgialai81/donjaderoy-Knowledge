package com.example.server.service.impl;

import com.example.server.config.AppProperties;
import com.example.server.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {
    private final JavaMailSender mailSender;
    private final AppProperties appProperties;

    @Override
    public void sendOtpEmail(String to, String subject, String title, String otpCode, String expiryText) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setFrom(appProperties.getMail().getFrom());
        message.setSubject(subject);
        message.setText(title + "\n\nOTP: " + otpCode + "\nHiệu lực: " + expiryText + "\n\nNếu bạn không yêu cầu thao tác này, hãy bỏ qua email.");
        mailSender.send(message);
    }
}
