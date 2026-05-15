package com.example.server.controller;

import com.example.server.model.dto.BanUserDTO;
import com.example.server.model.dto.PermissionAssignmentDTO;
import com.example.server.model.dto.ResolveReportDTO;
import com.example.server.model.dto.UpdateUserRoleDTO;
import com.example.server.model.response.ResponseObject;
import com.example.server.security.AppUserPrincipal;
import com.example.server.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('PERM_ADMIN_DASHBOARD_VIEW')")
    public ResponseObject dashboard() {
        return adminService.dashboard();
    }

    @GetMapping("/reports")
    @PreAuthorize("hasAuthority('PERM_REPORT_VIEW')")
    public ResponseObject listReports(@RequestParam(required = false) String status,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "10") int size) {
        return adminService.listReports(status, page, size);
    }

    @PostMapping("/reports/{id}/resolve")
    @PreAuthorize("hasAuthority('PERM_REPORT_RESOLVE')")
    public ResponseObject resolveReport(@PathVariable String id,
                                        @RequestBody ResolveReportDTO dto,
                                        @AuthenticationPrincipal AppUserPrincipal principal) {
        return adminService.resolveReport(id, principal.getUser().getId(), dto.getActionTaken());
    }

    @PostMapping("/ban")
    @PreAuthorize("hasAuthority('PERM_USER_BAN')")
    public ResponseObject banUser(@RequestBody BanUserDTO dto,
                                  @AuthenticationPrincipal AppUserPrincipal principal) {
        return adminService.banUser(dto.getUserId(), principal.getUser().getId(), dto.getReason(), dto.getDays());
    }

    @PostMapping("/users/{userId}/unban")
    @PreAuthorize("hasAuthority('PERM_USER_UNBAN')")
    public ResponseObject unbanUser(@PathVariable String userId,
                                    @RequestParam(required = false) String reason,
                                    @AuthenticationPrincipal AppUserPrincipal principal) {
        return adminService.unbanUser(userId, principal.getUser().getId(), reason);
    }

    @GetMapping("/users")
    @PreAuthorize("hasAuthority('PERM_USER_VIEW')")
    public ResponseObject listUsers(@RequestParam(defaultValue = "") String keyword,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "10") int size) {
        return adminService.searchUsers(keyword, page, size);
    }

    @PutMapping("/users/{userId}/role")
    @PreAuthorize("hasAuthority('PERM_USER_ROLE_ASSIGN')")
    public ResponseObject updateRole(@PathVariable String userId,
                                     @RequestBody UpdateUserRoleDTO dto,
                                     @AuthenticationPrincipal AppUserPrincipal principal) {
        return adminService.updateUserRole(userId, principal.getUser().getId(), dto.getRole());
    }

    @GetMapping("/permissions/roles")
    @PreAuthorize("hasAuthority('PERM_PERMISSION_ROLE_VIEW')")
    public ResponseObject rolePermissions() {
        return adminService.getRolePermissions();
    }

    @GetMapping("/permissions/roles/{roleName}")
    @PreAuthorize("hasAuthority('PERM_PERMISSION_ROLE_VIEW')")
    public ResponseObject rolePermissions(@PathVariable String roleName) {
        return adminService.getRolePermissions(roleName);
    }

    @PostMapping("/permissions/roles/{roleName}")
    @PreAuthorize("hasAuthority('PERM_PERMISSION_ROLE_MANAGE')")
    public ResponseObject grantRolePermission(@PathVariable String roleName,
                                              @RequestBody PermissionAssignmentDTO dto,
                                              @AuthenticationPrincipal AppUserPrincipal principal) {
        return adminService.grantRolePermission(roleName, dto.getPermissionCode(), dto.getNote(), principal.getUser().getId());
    }

    @DeleteMapping("/permissions/roles/{roleName}/{permissionCode}")
    @PreAuthorize("hasAuthority('PERM_PERMISSION_ROLE_MANAGE')")
    public ResponseObject revokeRolePermission(@PathVariable String roleName,
                                               @PathVariable String permissionCode,
                                               @AuthenticationPrincipal AppUserPrincipal principal) {
        return adminService.revokeRolePermission(roleName, permissionCode, principal.getUser().getId());
    }

    @GetMapping("/permissions/users/{userId}")
    @PreAuthorize("hasAuthority('PERM_PERMISSION_USER_VIEW')")
    public ResponseObject userPermissions(@PathVariable String userId) {
        return adminService.getUserPermissions(userId);
    }

    @PostMapping("/permissions/users/{userId}")
    @PreAuthorize("hasAuthority('PERM_PERMISSION_USER_MANAGE')")
    public ResponseObject setUserPermission(@PathVariable String userId,
                                            @RequestBody PermissionAssignmentDTO dto,
                                            @AuthenticationPrincipal AppUserPrincipal principal) {
        return adminService.setUserPermission(userId, dto.getPermissionCode(), dto.getGranted(), dto.getNote(), principal.getUser().getId());
    }

    @GetMapping("/actions")
    @PreAuthorize("hasAuthority('PERM_ADMIN_ACTION_VIEW')")
    public ResponseObject actions() {
        return adminService.listAdminActions();
    }
}
