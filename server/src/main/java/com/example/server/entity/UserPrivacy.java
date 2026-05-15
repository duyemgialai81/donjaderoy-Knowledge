package com.example.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_privacy")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPrivacy {
    @Id
    private String userId;

    @Enumerated(EnumType.STRING)
    private PrivacyLevel allowMessagesFrom;

    private Boolean requireApproval;
    private LocalDateTime updatedAt;

    public enum PrivacyLevel { everyone, mutual_followers }
}