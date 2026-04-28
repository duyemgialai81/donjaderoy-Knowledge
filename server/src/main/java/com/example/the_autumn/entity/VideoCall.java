package com.example.the_autumn.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "video_calls")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VideoCall {
    @Id
    private String id;

    private String conversationId;
    private String callerId;

    @Enumerated(EnumType.STRING)
    private CallStatus status;

    private LocalDateTime startedAt;
    private LocalDateTime endedAt;

    public enum CallStatus { ongoing, completed, missed, declined }
}