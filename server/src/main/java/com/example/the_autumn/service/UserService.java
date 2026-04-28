package com.example.the_autumn.service;

import com.example.the_autumn.model.dto.PrivacySettingsDTO;
import com.example.the_autumn.model.dto.UserDTO;
import com.example.the_autumn.model.response.ResponseObject;

public interface UserService {
    ResponseObject getUserProfile(String id);
    ResponseObject followUser(String followerId, String followeeId);
    ResponseObject unfollowUser(String followerId, String followeeId);
    ResponseObject getFollowers(String userId, int page, int size);
    ResponseObject getFollowing(String userId, int page, int size);
    ResponseObject checkFollowStatus(String followerId, String followeeId);
    ResponseObject updateProfile(String userId, UserDTO dto);
    ResponseObject searchUsers(String keyword, int page, int size);
    ResponseObject getUserStats(String userId);


    ResponseObject getPrivacySettings(String userId);
    ResponseObject updatePrivacySettings(String userId, PrivacySettingsDTO dto);
    ResponseObject blockUser(String blockerId, String blockedId);
    ResponseObject unblockUser(String blockerId, String blockedId);
    ResponseObject getBlockedUsers(String userId, int page, int size);
}