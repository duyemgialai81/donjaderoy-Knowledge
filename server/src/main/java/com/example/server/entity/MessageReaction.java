package com.example.server.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "message_reactions",
        indexes = {
                // SỬA Ở ĐÂY: Dùng tên cột vật lý dưới DB (snake_case)
                @Index(name = "idx_reaction_user_message", columnList = "user_id, message_id, emoji", unique = true),
                @Index(name = "idx_message_reactions", columnList = "message_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageReaction {
    @Id
    private String id;

    // Tốt nhất nên map rõ tên cột để Hibernate không bao giờ nhầm lẫn
    @Column(name = "message_id")
    private String messageId;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "emoji")
    private String emoji; // ❤️, 😂, 👍, 😮, 😢, 🎉

    private LocalDateTime createdAt;

    // Helper method để generate key Redis
    public String getRedisKey() {
        return "reaction:" + messageId + ":" + userId;
    }

    public static String getRedisSetKey(String messageId) {
        return "reactions:" + messageId;
    }
}