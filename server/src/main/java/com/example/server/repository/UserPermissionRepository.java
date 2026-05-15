package com.example.server.repository;

import com.example.server.entity.UserPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserPermissionRepository extends JpaRepository<UserPermission, String> {
    List<UserPermission> findByUserId(String userId);
    Optional<UserPermission> findByUserIdAndPermissionCode(String userId, String permissionCode);
}
