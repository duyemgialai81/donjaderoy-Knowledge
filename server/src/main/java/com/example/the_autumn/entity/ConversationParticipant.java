package com.example.the_autumn.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "conversation_participants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(ConversationParticipantId.class)
public class ConversationParticipant {

    @Id
    private String conversationId;

    @Id
    private String userId;

    @Enumerated(EnumType.STRING)
    private ParticipantRole role;

    @Enumerated(EnumType.STRING)
    private ParticipantStatus status;

    private LocalDateTime lastReadAt;
    private LocalDateTime joinedAt;

    public enum ParticipantRole { admin, member }
    public enum ParticipantStatus { accepted, pending, blocked }
}