package com.example.the_autumn.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_actions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAction {
    @Id
    private String id;

    private String adminId;
    private String action;
    private String targetType;
    private String targetId;
    private String reason;
    private String metadata; // store JSON as String
    private LocalDateTime createdAt;
}
