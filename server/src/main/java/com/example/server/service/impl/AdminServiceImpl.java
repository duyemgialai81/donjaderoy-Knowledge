package com.example.server.service.impl;

import com.example.server.entity.AdminAction;
import com.example.server.entity.Ban;
import com.example.server.entity.Report;
import com.example.server.entity.RolePermission;
import com.example.server.entity.User;
import com.example.server.model.dto.UserDTO;
import com.example.server.model.response.PageableObject;
import com.example.server.model.response.ResponseObject;
import com.example.server.repository.AdminActionRepository;
import com.example.server.repository.BanRepository;
import com.example.server.repository.ReportRepository;
import com.example.server.repository.SessionRepository;
import com.example.server.repository.UserRepository;
import com.example.server.security.PermissionCode;
import com.example.server.service.AdminService;
import com.example.server.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {
    private final ReportRepository reportRepository;
    private final AdminActionRepository adminActionRepository;
    private final BanRepository banRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final SessionRepository sessionRepository;

    @Override
    public ResponseObject dashboard() {
        Map<String, Object> dashboard = new LinkedHashMap<>();
        LocalDateTime now = LocalDateTime.now();
        dashboard.put("totalUsers", userRepository.count());
        dashboard.put("activeUsers", userRepository.countByIsActive(true));
        dashboard.put("pendingReports", reportRepository.countByStatus(Report.Status.pending));
        dashboard.put("resolvedReports", reportRepository.countByStatus(Report.Status.resolved));
        dashboard.put("activeBans", banRepository.countActiveBans(now));
        dashboard.put("recentActions", adminActionRepository.findTop50ByOrderByCreatedAtDesc());
        return ResponseObject.success(dashboard, "OK");
    }

    @Override
    public ResponseObject listReports(String status, int page, int size) {
        try {
            PageRequest pageRequest = PageRequest.of(normalizePage(page), normalizeSize(size));
            Page<Report> reports = (status == null || status.isBlank())
                    ? reportRepository.findAll(pageRequest)
                    : reportRepository.findByStatus(Report.Status.valueOf(status.toLowerCase()), pageRequest);
            return ResponseObject.success(
                    new PageableObject<>(reports.getContent(), reports.getNumber(), reports.getSize(),
                            reports.getTotalElements(), reports.getTotalPages()),
                    "OK"
            );
        } catch (IllegalArgumentException ex) {
            return ResponseObject.error("Invalid report status");
        }
    }

    @Override
    @Transactional
    public ResponseObject resolveReport(String reportId, String adminId, String actionTaken) {
        Report report = reportRepository.findById(reportId).orElse(null);
        if (report == null) {
            return ResponseObject.error("Report not found");
        }

        report.setStatus(Report.Status.resolved);
        report.setHandledBy(adminId);
        report.setHandledAt(LocalDateTime.now());
        reportRepository.save(report);

        logAction(adminId, "resolve_report", "report", reportId, actionTaken);
        return ResponseObject.success(report, "Report resolved");
    }

    @Override
    @Transactional
    public ResponseObject banUser(String userId, String adminId, String reason, Integer days) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseObject.error("User not found");
        }
        if (Objects.equals(userId, adminId)) {
            return ResponseObject.error("You cannot ban yourself");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime endAt = days == null ? null : now.plusDays(days);
        Ban ban = Ban.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .bannedBy(adminId)
                .reason(reason)
                .startAt(now)
                .endAt(endAt)
                .isActive(true)
                .createdAt(now)
                .build();
        banRepository.save(ban);

        user.setIsActive(false);
        user.setUpdatedAt(now);
        userRepository.save(user);

        sessionRepository.findByUserId(userId).forEach(session -> {
            session.setIsActive(false);
            session.setLogoutAt(now);
        });

        logAction(adminId, "ban_user", "user", userId, reason);
        return ResponseObject.success(ban, "User banned");
    }

    @Override
    @Transactional
    public ResponseObject unbanUser(String userId, String adminId, String reason) {
        List<Ban> bans = banRepository.findByUserIdAndIsActiveTrue(userId);
        if (bans.isEmpty()) {
            return ResponseObject.error("No active ban found");
        }

        LocalDateTime now = LocalDateTime.now();
        bans.forEach(ban -> {
            ban.setIsActive(false);
            if (ban.getEndAt() == null || ban.getEndAt().isAfter(now)) {
                ban.setEndAt(now);
            }
        });
        banRepository.saveAll(bans);

        userRepository.findById(userId).ifPresent(user -> {
            user.setIsActive(true);
            user.setUpdatedAt(now);
            userRepository.save(user);
        });

        logAction(adminId, "unban_user", "user", userId, reason);
        return ResponseObject.success(null, "User unbanned");
    }

    @Override
    public ResponseObject searchUsers(String keyword, int page, int size) {
        PageRequest pageRequest = PageRequest.of(normalizePage(page), normalizeSize(size));
        Page<User> users = (keyword == null || keyword.isBlank())
                ? userRepository.findAll(pageRequest)
                : userRepository.searchByNameOrEmail(keyword, pageRequest);

        List<Map<String, Object>> items = users.getContent().stream()
                .map(user -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("user", convertToDTO(user));
                    item.put("permissions", permissionService.getEffectivePermissions(user));
                    item.put("banned", banRepository.hasActiveBan(user.getId(), LocalDateTime.now()));
                    return item;
                })
                .collect(Collectors.toList());

        return ResponseObject.success(
                new PageableObject<>(items, users.getNumber(), users.getSize(), users.getTotalElements(), users.getTotalPages()),
                "OK"
        );
    }

    @Override
    @Transactional
    public ResponseObject updateUserRole(String userId, String adminId, String roleName) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseObject.error("User not found");
        }

        try {
            User.Role newRole = User.Role.valueOf(roleName.toLowerCase());
            user.setRole(newRole);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
            logAction(adminId, "update_user_role", "user", userId, "role=" + newRole.name());
            return ResponseObject.success(convertToDTO(user), "Role updated");
        } catch (Exception ex) {
            return ResponseObject.error("Invalid role");
        }
    }

    @Override
    public ResponseObject getRolePermissions() {
        Map<String, List<RolePermission>> data = Arrays.stream(User.Role.values())
                .collect(Collectors.toMap(
                        User.Role::name,
                        role -> permissionService.getRolePermissions(role.name()),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
        return ResponseObject.success(data, "OK");
    }

    @Override
    public ResponseObject getRolePermissions(String roleName) {
        try {
            return ResponseObject.success(permissionService.getRolePermissions(roleName), "OK");
        } catch (Exception ex) {
            return ResponseObject.error("Invalid role");
        }
    }

    @Override
    @Transactional
    public ResponseObject grantRolePermission(String roleName, String permissionCode, String description, String adminId) {
        try {
            RolePermission rolePermission = permissionService.upsertRolePermission(roleName, PermissionCode.from(permissionCode), description);
            logAction(adminId, "grant_role_permission", "role", roleName, permissionCode);
            return ResponseObject.success(rolePermission, "Role permission granted");
        } catch (Exception ex) {
            return ResponseObject.error(ex.getMessage());
        }
    }

    @Override
    @Transactional
    public ResponseObject revokeRolePermission(String roleName, String permissionCode, String adminId) {
        try {
            permissionService.removeRolePermission(roleName, PermissionCode.from(permissionCode));
            logAction(adminId, "revoke_role_permission", "role", roleName, permissionCode);
            return ResponseObject.success(null, "Role permission revoked");
        } catch (Exception ex) {
            return ResponseObject.error(ex.getMessage());
        }
    }

    @Override
    public ResponseObject getUserPermissions(String userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseObject.error("User not found");
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("user", convertToDTO(user));
        data.put("rolePermissions", permissionService.getRolePermissions(user.getRole().name()));
        data.put("userOverrides", permissionService.getUserPermissions(userId));
        data.put("effectivePermissions", permissionService.getEffectivePermissions(user));
        return ResponseObject.success(data, "OK");
    }

    @Override
    @Transactional
    public ResponseObject setUserPermission(String userId, String permissionCode, Boolean granted, String note, String adminId) {
        if (granted == null) {
            return ResponseObject.error("Missing granted flag");
        }
        if (userRepository.findById(userId).isEmpty()) {
            return ResponseObject.error("User not found");
        }

        try {
            var result = permissionService.upsertUserPermission(userId, PermissionCode.from(permissionCode), granted, note);
            logAction(adminId, "set_user_permission", "user", userId, permissionCode + ":" + granted);
            return ResponseObject.success(result, "User permission updated");
        } catch (Exception ex) {
            return ResponseObject.error(ex.getMessage());
        }
    }

    @Override
    public ResponseObject listAdminActions() {
        return ResponseObject.success(adminActionRepository.findTop50ByOrderByCreatedAtDesc(), "OK");
    }

    private void logAction(String adminId, String action, String targetType, String targetId, String reason) {
        adminActionRepository.save(AdminAction.builder()
                .id(UUID.randomUUID().toString())
                .adminId(adminId)
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .reason(reason)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setAvatar(user.getAvatar());
        dto.setRole(user.getRole() != null ? user.getRole().name() : null);
        dto.setAuthProvider(user.getAuthProvider() != null ? user.getAuthProvider().name() : null);
        dto.setEmailVerified(user.getEmailVerified());
        dto.setMajorId(user.getMajorId());
        dto.setClassName(user.getClassName());
        dto.setPoints(user.getPoints());
        dto.setBio(user.getBio());
        dto.setFollowers(user.getFollowers());
        dto.setFollowing(user.getFollowing());
        dto.setPostsCount(user.getPostsCount());
        dto.setIsActive(user.getIsActive());
        dto.setCreatedAt(user.getCreatedAt());
        return dto;
    }

    private int normalizePage(int page) {
        return Math.max(0, page);
    }

    private int normalizeSize(int size) {
        if (size <= 0) {
            return 20;
        }
        return Math.min(size, 100);
    }
}
