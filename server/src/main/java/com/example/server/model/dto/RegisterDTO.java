package com.example.server.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterDTO {
    private String email;
    private String password;
    private String otp;
    private String name;
    private String role; // student|lecturer
    private String majorId;
    private String className;
    private String deviceId;
    private String deviceName;
    private String userAgent;
    private String ipAddress;
}
