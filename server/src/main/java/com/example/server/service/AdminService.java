package com.example.server.service;

import com.example.server.model.response.ResponseObject;

public interface AdminService {
    ResponseObject dashboard();
    ResponseObject listReports(String status, int page, int size);
    ResponseObject resolveReport(String reportId, String adminId, String actionTaken);
    ResponseObject banUser(String userId, String adminId, String reason, Integer days);
    ResponseObject unbanUser(String userId, String adminId, String reason);
    ResponseObject searchUsers(String keyword, int page, int size);
    ResponseObject updateUserRole(String userId, String adminId, String roleName);
    ResponseObject getRolePermissions();
    ResponseObject getRolePermissions(String roleName);
    ResponseObject grantRolePermission(String roleName, String permissionCode, String description, String adminId);
    ResponseObject revokeRolePermission(String roleName, String permissionCode, String adminId);
    ResponseObject getUserPermissions(String userId);
    ResponseObject setUserPermission(String userId, String permissionCode, Boolean granted, String note, String adminId);
    ResponseObject listAdminActions();
}
