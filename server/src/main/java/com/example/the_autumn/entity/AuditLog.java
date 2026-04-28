package com.example.the_autumn.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userId;
    private String actionType;
    private String targetType;
    private String targetId;
    private String ipAddress;
    private String userAgent;
    private String details; // store JSON as String then parse via Jackson if needed
    private LocalDateTime createdAt;
}
