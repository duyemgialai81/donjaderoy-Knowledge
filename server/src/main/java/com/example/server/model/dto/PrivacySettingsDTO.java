package com.example.server.model.dto;
import lombok.Data;

@Data
public class PrivacySettingsDTO {
    private String allowMessagesFrom; // "everyone" hoặc "mutual_followers"
    private Boolean requireApproval;  // true: tin nhắn người lạ vào tin nhắn chờ
}