package com.example.the_autumn.controller;

import com.example.the_autumn.model.dto.PrivacySettingsDTO;
import com.example.the_autumn.model.dto.UserDTO;
import com.example.the_autumn.model.response.ResponseObject;
import com.example.the_autumn.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

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
            @RequestBody UserDTO dto) {
        return userService.updateProfile(userId, dto);
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
            @PathVariable String followeeId) {
        return userService.followUser(followerId, followeeId);
    }

    @DeleteMapping("/{followerId}/unfollow/{followeeId}")
    public ResponseObject unfollowUser(
            @PathVariable String followerId,
            @PathVariable String followeeId) {
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