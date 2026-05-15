package com.example.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "bans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ban {
    @Id
    private String id;

    private String userId;
    private String bannedBy;
    private String reason;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
