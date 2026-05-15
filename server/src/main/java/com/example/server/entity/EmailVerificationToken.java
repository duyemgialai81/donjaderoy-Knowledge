package com.example.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_verification_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailVerificationToken {
    @Id
    private String id;

    private String userId;
    private String email;
    private String token;
    private String passwordHash;
    private String pendingName;
    private String pendingRole;
    private String majorId;
    private String className;
    private String deviceId;
    private String deviceName;
    private String userAgent;
    private String ipAddress;
    private LocalDateTime expiresAt;
    private Boolean used;
    private LocalDateTime createdAt;
    private LocalDateTime verifiedAt;
}
