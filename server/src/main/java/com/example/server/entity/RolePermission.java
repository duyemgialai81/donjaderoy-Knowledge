package com.example.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "role_permissions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"roleName", "permissionCode"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RolePermission {
    @Id
    private String id;

    private String roleName;
    private String permissionCode;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
