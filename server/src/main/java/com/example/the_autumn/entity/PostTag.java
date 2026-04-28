package com.example.the_autumn.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "post_tags")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(PostTagId.class)
public class PostTag {

    @Id
    private String postId;

    @Id
    private Integer tagId;
}
