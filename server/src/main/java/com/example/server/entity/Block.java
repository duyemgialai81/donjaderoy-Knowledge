package com.example.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "blocks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(BlockId.class)
public class Block {

    @Id
    @Column(name = "blocker_id")
    private String blockerId;

    @Id
    @Column(name = "blocked_id")
    private String blockedId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}