package com.example.the_autumn.model.dto;

import lombok.Data;

@Data
public class AuthDTO {
    private String email;
    private String password;
    private String deviceId;
    private String deviceName;
    private String userAgent;
    private String ipAddress;
}
