package com.example.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_permissions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "permissionCode"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPermission {
    @Id
    private String id;

    private String userId;
    private String permissionCode;
    private Boolean granted;
    private String note;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
