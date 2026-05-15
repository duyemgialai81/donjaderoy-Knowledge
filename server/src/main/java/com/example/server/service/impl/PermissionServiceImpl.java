package com.example.server.service.impl;

import com.example.server.entity.RolePermission;
import com.example.server.entity.User;
import com.example.server.entity.UserPermission;
import com.example.server.repository.RolePermissionRepository;
import com.example.server.repository.UserPermissionRepository;
import com.example.server.security.PermissionCode;
import com.example.server.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PermissionServiceImpl implements PermissionService {
    private final RolePermissionRepository rolePermissionRepository;
    private final UserPermissionRepository userPermissionRepository;

    @Override
    @Transactional
    public Set<String> getEffectivePermissions(User user) {
        ensureDefaults();
        Set<String> permissions = rolePermissionRepository.findByRoleName(user.getRole().name())
                .stream()
                .map(RolePermission::getPermissionCode)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        for (UserPermission override : userPermissionRepository.findByUserId(user.getId())) {
            if (Boolean.TRUE.equals(override.getGranted())) {
                permissions.add(override.getPermissionCode());
            } else {
                permissions.remove(override.getPermissionCode());
            }
        }
        return permissions;
    }

    @Override
    @Transactional
    public List<RolePermission> getRolePermissions(String roleName) {
        ensureDefaults();
        return rolePermissionRepository.findByRoleName(normalizeRole(roleName));
    }

    @Override
    @Transactional
    public RolePermission upsertRolePermission(String roleName, PermissionCode permissionCode, String description) {
        ensureDefaults();
        String normalizedRole = normalizeRole(roleName);
        RolePermission permission = rolePermissionRepository
                .findByRoleNameAndPermissionCode(normalizedRole, permissionCode.name())
                .orElseGet(RolePermission::new);
        if (permission.getId() == null) {
            permission.setId(UUID.randomUUID().toString());
            permission.setCreatedAt(LocalDateTime.now());
        }
        permission.setRoleName(normalizedRole);
        permission.setPermissionCode(permissionCode.name());
        permission.setDescription(description);
        permission.setUpdatedAt(LocalDateTime.now());
        return rolePermissionRepository.save(permission);
    }

    @Override
    @Transactional
    public void removeRolePermission(String roleName, PermissionCode permissionCode) {
        ensureDefaults();
        rolePermissionRepository.findByRoleNameAndPermissionCode(normalizeRole(roleName), permissionCode.name())
                .ifPresent(rolePermissionRepository::delete);
    }

    @Override
    public List<UserPermission> getUserPermissions(String userId) {
        return userPermissionRepository.findByUserId(userId);
    }

    @Override
    @Transactional
    public UserPermission upsertUserPermission(String userId, PermissionCode permissionCode, boolean granted, String note) {
        UserPermission permission = userPermissionRepository.findByUserIdAndPermissionCode(userId, permissionCode.name())
                .orElseGet(UserPermission::new);
        if (permission.getId() == null) {
            permission.setId(UUID.randomUUID().toString());
            permission.setCreatedAt(LocalDateTime.now());
        }
        permission.setUserId(userId);
        permission.setPermissionCode(permissionCode.name());
        permission.setGranted(granted);
        permission.setNote(note);
        permission.setUpdatedAt(LocalDateTime.now());
        return userPermissionRepository.save(permission);
    }

    private void ensureDefaults() {
        seedRole(User.Role.admin, EnumSet.allOf(PermissionCode.class));
        seedRole(User.Role.lecturer, EnumSet.of(PermissionCode.USER_VIEW));
        seedRole(User.Role.student, EnumSet.noneOf(PermissionCode.class));
    }

    private void seedRole(User.Role role, Set<PermissionCode> defaults) {
        if (!rolePermissionRepository.findByRoleName(role.name()).isEmpty()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        List<RolePermission> permissions = defaults.stream()
                .map(permissionCode -> RolePermission.builder()
                        .id(UUID.randomUUID().toString())
                        .roleName(role.name())
                        .permissionCode(permissionCode.name())
                        .description("Default permission for role " + role.name())
                        .createdAt(now)
                        .updatedAt(now)
                        .build())
                .toList();
        if (!permissions.isEmpty()) {
            rolePermissionRepository.saveAll(permissions);
        }
    }

    private String normalizeRole(String roleName) {
        return User.Role.valueOf(roleName.toLowerCase()).name();
    }
}
