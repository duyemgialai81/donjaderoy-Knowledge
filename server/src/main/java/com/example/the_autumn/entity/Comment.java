package com.example.the_autumn.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "comments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comment {
    @Id
    private String id;
    private String postId;
    private String authorId;

    @Column(columnDefinition = "TEXT")
    private String content;

    private String parentId;
    private LocalDateTime createdAt;
    private Integer likes;
    private Boolean isReported;
}
