package com.example.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_badges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(UserBadgeId.class)
public class UserBadge {

    @Id
    private String userId;

    @Id
    private String badgeId;

    private LocalDateTime awardedAt;
}
