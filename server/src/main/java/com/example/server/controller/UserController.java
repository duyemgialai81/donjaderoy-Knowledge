package com.example.server.controller;

import com.example.server.model.dto.PrivacySettingsDTO;
import com.example.server.model.dto.UserDTO;
import com.example.server.model.response.ResponseObject;
import com.example.server.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.Principal;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    // ==========================================
    // API QUẢN LÝ THÔNG TIN CÁ NHÂN & TÌM KIẾM
    // ==========================================

    @GetMapping("/{id}")
    public ResponseObject getUserProfile(@PathVariable String id) {
        return userService.getUserProfile(id);
    }

    @PutMapping("/{userId}")
    public ResponseObject updateProfile(
            @PathVariable String userId,
            @RequestBody UserDTO dto,
            Principal principal) {
        if (principal == null || !principal.getName().equals(userId)) {
            return ResponseObject.error("Forbidden");
        }
        return userService.updateProfile(userId, dto);
    }

    @PostMapping("/{userId}/avatar")
    public ResponseObject uploadAvatar(
            @PathVariable String userId,
            @RequestParam("file") MultipartFile file,
            Principal principal) {
        if (principal == null || !principal.getName().equals(userId)) {
            return ResponseObject.error("Forbidden");
        }
        if (file == null || file.isEmpty()) {
            return ResponseObject.error("File is required");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!contentType.startsWith("image/")) {
            return ResponseObject.error("Only image files are allowed");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseObject.error("Avatar must be smaller than 5MB");
        }
        try {
            String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
            String ext = ".jpg";
            int dot = original.lastIndexOf('.');
            if (dot >= 0 && dot < original.length() - 1) {
                ext = original.substring(dot).replaceAll("[^A-Za-z0-9.]", "").toLowerCase(Locale.ROOT);
            }
            Path dir = Paths.get("uploads", "avatars").toAbsolutePath().normalize();
            Files.createDirectories(dir);
            String fileName = userId + "-" + UUID.randomUUID() + ext;
            Path target = dir.resolve(fileName).normalize();
            file.transferTo(target.toFile());
            String avatarUrl = "/uploads/avatars/" + fileName;
            UserDTO dto = new UserDTO();
            dto.setAvatar(avatarUrl);
            userService.updateProfile(userId, dto);
            return ResponseObject.success(Map.of("avatar", avatarUrl), "Avatar uploaded");
        } catch (Exception e) {
            return ResponseObject.error("Upload failed: " + e.getMessage());
        }
    }

    @GetMapping("/search")
    public ResponseObject searchUsers(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return userService.searchUsers(keyword, page, size);
    }

    @GetMapping("/{userId}/stats")
    public ResponseObject getUserStats(@PathVariable String userId) {
        return userService.getUserStats(userId);
    }

    // ==========================================
    // API THEO DÕI (FOLLOW)
    // ==========================================

    @PostMapping("/{followerId}/follow/{followeeId}")
    public ResponseObject followUser(
            @PathVariable String followerId,
            @PathVariable String followeeId,
            Principal principal) {
        if (principal == null || !principal.getName().equals(followerId)) {
            return ResponseObject.error("Forbidden");
        }
        return userService.followUser(followerId, followeeId);
    }

    @DeleteMapping("/{followerId}/unfollow/{followeeId}")
    public ResponseObject unfollowUser(
            @PathVariable String followerId,
            @PathVariable String followeeId,
            Principal principal) {
        if (principal == null || !principal.getName().equals(followerId)) {
            return ResponseObject.error("Forbidden");
        }
        return userService.unfollowUser(followerId, followeeId);
    }

    @GetMapping("/{userId}/followers")
    public ResponseObject getFollowers(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return userService.getFollowers(userId, page, size);
    }

    @GetMapping("/{userId}/following")
    public ResponseObject getFollowing(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return userService.getFollowing(userId, page, size);
    }

    @GetMapping("/follow-status")
    public ResponseObject checkFollowStatus(
            @RequestParam String followeeId,
            Principal principal) {
        if (principal == null) {
            return new ResponseObject("Authentication required to check follow status.", null);
        }
        String followerId = principal.getName();
        return userService.checkFollowStatus(followerId, followeeId);
    }

    @GetMapping("/privacy")
    public ResponseObject getPrivacySettings(Principal principal) {
        if (principal == null) {
            return new ResponseObject("Lỗi xác thực. Vui lòng đăng nhập.", null);
        }
        return userService.getPrivacySettings(principal.getName());
    }

    @PutMapping("/privacy")
    public ResponseObject updatePrivacySettings(
            @RequestBody PrivacySettingsDTO dto,
            Principal principal) {
        if (principal == null) {
            return new ResponseObject("Lỗi xác thực. Vui lòng đăng nhập.", null);
        }
        return userService.updatePrivacySettings(principal.getName(), dto);
    }

    @PostMapping("/{blockedId}/block")
    public ResponseObject blockUser(
            @PathVariable String blockedId,
            Principal principal) {
        if (principal == null) {
            return new ResponseObject("Lỗi xác thực. Vui lòng đăng nhập.", null);
        }
        return userService.blockUser(principal.getName(), blockedId);
    }

    @DeleteMapping("/{blockedId}/unblock")
    public ResponseObject unblockUser(
            @PathVariable String blockedId,
            Principal principal) {
        if (principal == null) {
            return new ResponseObject("Lỗi xác thực. Vui lòng đăng nhập.", null);
        }
        return userService.unblockUser(principal.getName(), blockedId);
    }

    @GetMapping("/blocks")
    public ResponseObject getBlockedUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Principal principal) {
        if (principal == null) {
            return new ResponseObject("Lỗi xác thực. Vui lòng đăng nhập.", null);
        }
        return userService.getBlockedUsers(principal.getName(), page, size);
    }
}
