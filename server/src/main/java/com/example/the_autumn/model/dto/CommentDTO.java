package com.example.the_autumn.model.dto;

import lombok.Data;

@Data
public class CommentDTO {
    private String id;
    private String postId;
    private String authorId;
    private String content;
    private String parentId;
}
