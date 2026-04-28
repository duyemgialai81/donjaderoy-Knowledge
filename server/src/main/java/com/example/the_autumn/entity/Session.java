package com.example.the_autumn.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Session {
    @Id
    private String id;

    private String userId;
    private String deviceId;
    private String token;
    private String ipAddress;
    private String userAgent;
    private LocalDateTime loginAt;
    private LocalDateTime logoutAt;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
