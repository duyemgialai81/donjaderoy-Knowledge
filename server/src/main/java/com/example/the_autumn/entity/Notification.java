package com.example.the_autumn.entity;

import jakarta.persistence.*;
import lombok.*;

import java.lang.reflect.Type;
import java.time.LocalDateTime;

@Entity
@Table(name = "notification")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {
    @Id
    private String id;

    private String userId;
    private String actorId;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    private String title;
    private String description;
    private String postId;
    private String commentId;
    private String referenceId;
    private String url;
    private Boolean isRead;
    private LocalDateTime createdAt;

    public enum NotificationType {
        like, comment, follow, badge, mention, report
    }
}
