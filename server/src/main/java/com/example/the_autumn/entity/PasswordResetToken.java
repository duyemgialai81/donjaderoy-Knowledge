package com.example.the_autumn.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "password_reset_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetToken {
    @Id
    private String id;

    private String userId;
    private String token;
    private LocalDateTime expiresAt;
    private Boolean used;
    private LocalDateTime createdAt;
}
