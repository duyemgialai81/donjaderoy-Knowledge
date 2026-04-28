package com.example.the_autumn.model.dto;

import lombok.Data;

@Data
public class SessionDTO {
    private String id;
    private String userId;
    private String deviceId;
    private String ipAddress;
    private String userAgent;
    private Boolean isActive;
}
