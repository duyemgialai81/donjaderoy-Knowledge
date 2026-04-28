package com.example.the_autumn.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Post {
    @Id
    private String id;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    private String authorId;
    private String topic;

    @Enumerated(EnumType.STRING)
    private Status status;

    private String majorId;
    private String subjectId;

    private String videoUrl;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Integer views;
    private Integer likesCount;
    private Integer commentsCount;

    public enum Status { published, draft, pending }
}
