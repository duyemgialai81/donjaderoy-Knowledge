package com.example.the_autumn.entity;

import lombok.*;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class SavedPostId implements Serializable {
    private String userId;
    private String postId;
}
