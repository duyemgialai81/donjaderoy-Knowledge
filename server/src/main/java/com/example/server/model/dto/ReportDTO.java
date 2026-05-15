package com.example.server.model.dto;

import lombok.Data;

@Data
public class ReportDTO {
    private String postId;
    private String reportedBy;
    private String reason;
    private String description;
}
