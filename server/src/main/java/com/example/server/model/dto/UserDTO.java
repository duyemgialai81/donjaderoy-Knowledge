package com.example.server.model.dto;

import com.example.server.entity.Badge;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private String id;
    private String name;
    private String email;
    private String avatar;
    private String role;
    private String authProvider;
    private Boolean emailVerified;
    private String majorId;
    private String className;
    private Integer points;
    private String bio;
    private Integer followers;
    private Integer following;
    private Integer postsCount;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<Badge> badges;

    // ✅ FIX LỖI 1: Thêm field này để builder nhận diện
    private Boolean isOnline;
}