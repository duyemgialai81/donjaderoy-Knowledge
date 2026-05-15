package com.example.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "devices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Device {
    @Id
    private String id;

    private String userId;
    private String deviceName;
    private String os;
    private String browser;
    private LocalDateTime lastSeen;
    private LocalDateTime createdAt;
}
