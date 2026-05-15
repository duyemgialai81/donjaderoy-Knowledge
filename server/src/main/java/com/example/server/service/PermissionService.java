package com.example.server.service;

import com.example.server.entity.RolePermission;
import com.example.server.entity.User;
import com.example.server.entity.UserPermission;
import com.example.server.security.PermissionCode;

import java.util.List;
import java.util.Set;

public interface PermissionService {
    Set<String> getEffectivePermissions(User user);
    List<RolePermission> getRolePermissions(String roleName);
    RolePermission upsertRolePermission(String roleName, PermissionCode permissionCode, String description);
    void removeRolePermission(String roleName, PermissionCode permissionCode);
    List<UserPermission> getUserPermissions(String userId);
    UserPermission upsertUserPermission(String userId, PermissionCode permissionCode, boolean granted, String note);
}
