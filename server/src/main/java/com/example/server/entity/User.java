package com.example.server.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    private String id;

    private String name;

    @Column(unique = true)
    private String email;

    @JsonIgnore
    private String password;
    private String avatar;
    @Enumerated(EnumType.STRING)
    private AuthProvider authProvider;
    @Column(unique = true)
    private String googleId;
    private Boolean emailVerified;

    @Enumerated(EnumType.STRING)
    private Role role;

    private String majorId;
    private String className;
    private Integer points;

    private Integer followers;
    private Integer following;

    private Integer postsCount;
    private Boolean isActive;

    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String bio;

    public enum Role { student, lecturer, admin }
    public enum AuthProvider { local, google }
}
