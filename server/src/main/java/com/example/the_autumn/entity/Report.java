package com.example.the_autumn.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report {
    @Id
    private String id;

    private String postId;
    private String reportedBy;
    private String reason;
    private String description;

    @Enumerated(EnumType.STRING)
    private Status status;

    private String handledBy;
    private LocalDateTime handledAt;
    private LocalDateTime createdAt;

    public enum Status { pending, reviewed, resolved }
}
