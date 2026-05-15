package com.example.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "conversations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {
    @Id
    private String id;

    @Enumerated(EnumType.STRING)
    private ConversationType type;

    private String name; // Null nếu là direct (1-1)
    private String createdBy; // Admin tạo nhóm

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public enum ConversationType { direct, group }
}