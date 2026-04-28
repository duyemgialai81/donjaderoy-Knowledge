package com.example.the_autumn.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "saved_posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(SavedPostId.class)
public class SavedPost {

    @Id
    private String userId;

    @Id
    private String postId;

    private LocalDateTime savedAt;
}
