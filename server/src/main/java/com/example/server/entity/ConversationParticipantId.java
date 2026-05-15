package com.example.server.entity;

import lombok.*;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ConversationParticipantId implements Serializable {
    private String conversationId;
    private String userId;
}