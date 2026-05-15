package com.example.server.repository;

import com.example.server.entity.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermission, String> {
    List<RolePermission> findByRoleName(String roleName);
    Optional<RolePermission> findByRoleNameAndPermissionCode(String roleName, String permissionCode);
    boolean existsByRoleNameAndPermissionCode(String roleName, String permissionCode);
}
