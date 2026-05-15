package com.example.server.model.dto;

import com.example.server.entity.Badge;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class UserDTO {
    private String id;
    private String name;
    private String email;
    private String avatar;
    private String role;
    private String majorId;
    private String className;
    private Integer points;
    private String bio;
    private Integer followers;
    private Integer following;
    private Integer postsCount;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private List<Badge> badges;

}
