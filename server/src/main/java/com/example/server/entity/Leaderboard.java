package com.example.server.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "leaderboard")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Leaderboard {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer rankNo;
    private String userId;
    private Integer points;
    private Integer postsThisWeek;
    private String badgeId;
}
