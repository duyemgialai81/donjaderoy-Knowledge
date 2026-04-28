package com.example.the_autumn.model.dto;

import lombok.Data;

import java.util.List;

@Data
public class PostDTO {
    private String id;
    private String title;
    private String content;
    private String authorId;
    private List<String> tags;
    private String majorId;
    private String subjectId;
    private String topic;
    private String status;
    private String videoUrl;
}
