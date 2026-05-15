package com.example.server.model.dto;

import lombok.Data;

@Data
public class GoogleLoginDTO {
    private String idToken;
    private String role;
    private String deviceId;
    private String deviceName;
    private String userAgent;
    private String ipAddress;
}
