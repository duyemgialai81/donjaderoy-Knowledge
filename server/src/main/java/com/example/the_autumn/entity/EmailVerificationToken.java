package com.example.the_autumn.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_verification_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailVerificationToken {
    @Id
    private String id;

    private String userId;
    private String token;
    private LocalDateTime expiresAt;
    private Boolean used;
    private LocalDateTime createdAt;
}
