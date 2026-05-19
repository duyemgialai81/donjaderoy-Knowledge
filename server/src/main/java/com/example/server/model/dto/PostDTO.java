package com.example.server.model.dto;

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
    private List<AttachmentDTO> attachments;

    @Data
    public static class AttachmentDTO {
        private String name;
        private String type;
        private String size;
        private String url;
    }
}
