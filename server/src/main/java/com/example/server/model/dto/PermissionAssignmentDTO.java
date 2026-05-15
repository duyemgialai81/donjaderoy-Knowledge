package com.example.server.model.dto;

import lombok.Data;

@Data
public class PermissionAssignmentDTO {
    private String permissionCode;
    private Boolean granted;
    private String note;
}
