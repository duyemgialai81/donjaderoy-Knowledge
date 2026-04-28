package com.example.the_autumn.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterDTO {
    private String email;
    private String password;
    private String name;
    private String role; // student|lecturer
    private String deviceId;
    private String deviceName;
    private String userAgent;
    private String ipAddress;
}
