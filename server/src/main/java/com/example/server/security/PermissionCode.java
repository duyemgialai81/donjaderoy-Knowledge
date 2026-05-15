package com.example.server.security;

import java.util.Arrays;

public enum PermissionCode {
    REPORT_VIEW,
    REPORT_RESOLVE,
    USER_BAN,
    USER_UNBAN,
    USER_VIEW,
    USER_ROLE_ASSIGN,
    PERMISSION_ROLE_VIEW,
    PERMISSION_ROLE_MANAGE,
    PERMISSION_USER_VIEW,
    PERMISSION_USER_MANAGE,
    ADMIN_ACTION_VIEW,
    ADMIN_DASHBOARD_VIEW;

    public static PermissionCode from(String value) {
        return Arrays.stream(values())
                .filter(permission -> permission.name().equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Invalid permission code: " + value));
    }
}
