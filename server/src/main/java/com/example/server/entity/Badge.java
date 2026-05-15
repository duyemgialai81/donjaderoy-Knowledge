package com.example.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "badges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Badge {
    @Id
    private String id;
    private String name;
    private String icon;
    private String description;
    private Integer requiredPoints;
    private String color;
    private LocalDateTime createdAt;
}
