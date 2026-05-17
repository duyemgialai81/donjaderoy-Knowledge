package com.example.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {
    @Id
    private String id;

    private String conversationId;
    private String senderId;

    @Enumerated(EnumType.STRING)
    private MessageType messageType;

    @Column(columnDefinition = "TEXT")
    private String content;

    private String replyToMessageId;
    private String attachmentUrl;
    private String attachmentName;
    private Long attachmentSize;

    private Boolean isDeleted;
    private LocalDateTime editedAt;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;

    public enum MessageType { text, image, video, call_log }
}
