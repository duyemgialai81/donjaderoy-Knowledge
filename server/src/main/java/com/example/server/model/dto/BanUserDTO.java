package com.example.server.model.dto;

import lombok.Data;

@Data
public class BanUserDTO {
    private String userId;
    private Integer days;
    private String reason;
}
