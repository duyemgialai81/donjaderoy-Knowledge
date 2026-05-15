////package com.example.the_autumn.service.impl;
////
////import com.example.the_autumn.entity.Follow;
////import com.example.the_autumn.entity.User;
////import com.example.the_autumn.model.dto.UserDTO;
////import com.example.the_autumn.model.response.ResponseObject;
////import com.example.the_autumn.repository.FollowRepository;
////import com.example.the_autumn.repository.UserRepository;
////import com.example.the_autumn.service.UserService;
////import org.springframework.beans.factory.annotation.Autowired;
////import org.springframework.stereotype.Service;
////
////import java.time.LocalDateTime;
////import java.util.Optional;
////import java.util.UUID;
////
////@Service
////public class UserServiceImpl implements UserService {
////
////    @Autowired
////    private UserRepository userRepository;
////
////    @Autowired
////    private FollowRepository followRepository;
////
////    @Override
////    public ResponseObject getUserProfile(String id) {
////        Optional<User> maybe = userRepository.findById(id);
////        if (maybe.isEmpty()) return ResponseObject.error("User not found");
////        User u = maybe.get();
////
////        UserDTO dto = new UserDTO();
////        dto.setId(u.getId());
////        dto.setName(u.getName());
////        dto.setEmail(u.getEmail());
////        dto.setAvatar(u.getAvatar());
////        dto.setRole(u.getRole().name());
////        dto.setMajorId(u.getMajorId());
////        dto.setClassName(u.getClassName());
////        dto.setPoints(u.getPoints());
////        dto.setFollowers(u.getFollowers());
////        dto.setFollowing(u.getFollowing());
////        dto.setPostsCount(u.getPostsCount());
////
////        return ResponseObject.success(dto, "OK");
////    }
////
////    @Override
////    public ResponseObject followUser(String followerId, String followeeId) {
////        // Simple check existence
////        Optional<User> follower = userRepository.findById(followerId);
////        Optional<User> followee = userRepository.findById(followeeId);
////        if (follower.isEmpty() || followee.isEmpty()) return ResponseObject.error("User not found");
////
////        // Check existing
////        var existing = followRepository.findById(new com.example.the_autumn.entity.FollowId(followerId, followeeId));
////        if (existing.isPresent()) return ResponseObject.error("Already following");
////
////        Follow f = Follow.builder()
////                .followerId(followerId)
////                .followeeId(followeeId)
////                .followedAt(LocalDateTime.now())
////                .build();
////        followRepository.save(f);
////
////        // Update counters
////        User f1 = follower.get();
////        f1.setFollowing(f1.getFollowing() == null ? 1 : f1.getFollowing() + 1);
////        userRepository.save(f1);
////
////        User f2 = followee.get();
////        f2.setFollowers(f2.getFollowers() == null ? 1 : f2.getFollowers() + 1);
////        userRepository.save(f2);
////
////        return ResponseObject.success(null, "Followed");
////    }
////
////    @Override
////    public ResponseObject unfollowUser(String followerId, String followeeId) {
////        Optional<com.example.the_autumn.entity.Follow> existing = followRepository.findById(new com.example.the_autumn.entity.FollowId(followerId, followeeId));
////        if (existing.isEmpty()) return ResponseObject.error("Follow relation not found");
////        followRepository.delete(existing.get());
////
////        Optional<User> follower = userRepository.findById(followerId);
////        Optional<User> followee = userRepository.findById(followeeId);
////        if (follower.isPresent()) {
////            User f1 = follower.get();
////            f1.setFollowing(Math.max(0, f1.getFollowing() == null ? 0 : f1.getFollowing() - 1));
////            userRepository.save(f1);
////        }
////        if (followee.isPresent()) {
////            User f2 = followee.get();
////            f2.setFollowers(Math.max(0, f2.getFollowers() == null ? 0 : f2.getFollowers() - 1));
////            userRepository.save(f2);
////        }
////
////        return ResponseObject.success(null, "Unfollowed");
////    }
////}
//package com.example.the_autumn.service.impl;
//
//import com.example.the_autumn.entity.*;
//import com.example.the_autumn.model.dto.PrivacySettingsDTO;
//import com.example.the_autumn.model.dto.UserDTO;
//import com.example.the_autumn.model.response.PageableObject;
//import com.example.the_autumn.model.response.ResponseObject;
//import com.example.the_autumn.repository.*;
//import com.example.the_autumn.service.UserService;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.data.domain.Page;
//import org.springframework.data.domain.PageRequest;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.time.LocalDateTime;
//import java.util.List;
//import java.util.Optional;
//import java.util.stream.Collectors;
//
//@Service
//public class UserServiceImpl implements UserService {
//
//    @Autowired
//    private UserRepository userRepository;
//
//    @Autowired
//    private FollowRepository followRepository;
//
//    @Autowired
//    private NotificationRepository notificationRepository;
//
//    @Autowired
//    private PostRepository postRepository;
//
//    @Autowired
//    private BadgeRepository badgeRepository;
//
//    @Autowired
//    private UserBadgeRepository userBadgeRepository;
//
//    @Autowired
//    private BlockRepository blockRepository;
//
//    @Autowired
//    private UserPrivacyRepository userPrivacyRepository;
//
//    @Override
//    public ResponseObject getUserProfile(String id) {
//        Optional<User> maybe = userRepository.findById(id);
//        if (maybe.isEmpty()) return ResponseObject.error("Không tìm thấy người dùng");
//
//        User u = maybe.get();
//
//        UserDTO dto = new UserDTO();
//        dto.setId(u.getId());
//        dto.setName(u.getName());
//        dto.setEmail(u.getEmail());
//        dto.setAvatar(u.getAvatar());
//        dto.setRole(u.getRole().name());
//        dto.setMajorId(u.getMajorId());
//        dto.setClassName(u.getClassName());
//        dto.setPoints(u.getPoints());
//        dto.setBio(u.getBio());
//        dto.setFollowers(u.getFollowers());
//        dto.setFollowing(u.getFollowing());
//        dto.setPostsCount(u.getPostsCount());
//        dto.setIsActive(u.getIsActive());
//        dto.setCreatedAt(u.getCreatedAt());
//
//        // Get user's badges
//        List<Badge> badges = userBadgeRepository.findByUserId(id).stream()
//                .map(ub -> badgeRepository.findById(ub.getBadgeId()).orElse(null))
//                .filter(b -> b != null)
//                .collect(Collectors.toList());
//        dto.setBadges(badges);
//
//        return ResponseObject.success(dto, "OK");
//    }
//
//    @Override
//    @Transactional
//    public ResponseObject followUser(String followerId, String followeeId) {
//        if (followerId.equals(followeeId)) {
//            return ResponseObject.error("Bạn không thể theo dõi chính mình");
//        }
//
//        // KIỂM TRA CHẶN LẪN NHAU (BLOCK)
//        if (blockRepository.existsByBlockerIdAndBlockedId(followerId, followeeId) ||
//                blockRepository.existsByBlockerIdAndBlockedId(followeeId, followerId)) {
//            return ResponseObject.error("Không thể theo dõi người dùng này (Bị chặn)");
//        }
//
//        Optional<User> follower = userRepository.findById(followerId);
//        Optional<User> followee = userRepository.findById(followeeId);
//
//        if (follower.isEmpty() || followee.isEmpty()) {
//            return ResponseObject.error("Không tìm thấy người dùng");
//        }
//
//        var existing = followRepository.findById(new FollowId(followerId, followeeId));
//        if (existing.isPresent()) {
//            return ResponseObject.error("Bạn đã theo dõi người dùng này rồi");
//        }
//
//        Follow f = Follow.builder()
//                .followerId(followerId)
//                .followeeId(followeeId)
//                .followedAt(LocalDateTime.now())
//                .build();
//        followRepository.save(f);
//
//        User f1 = follower.get();
//        f1.setFollowing(f1.getFollowing() == null ? 1 : f1.getFollowing() + 1);
//        userRepository.save(f1);
//
//        User f2 = followee.get();
//        f2.setFollowers(f2.getFollowers() == null ? 1 : f2.getFollowers() + 1);
//        userRepository.save(f2);
//
//        createNotification(followeeId, followerId, Notification.NotificationType.follow,
//                "Người theo dõi mới", f1.getName() + " đã theo dõi bạn", null, null);
//
//        return ResponseObject.success(null, "Đã theo dõi người dùng");
//    }
//
//    @Override
//    @Transactional
//    public ResponseObject unfollowUser(String followerId, String followeeId) {
//        Optional<Follow> existing = followRepository.findById(
//                new com.example.the_autumn.entity.FollowId(followerId, followeeId)
//        );
//
//        if (existing.isEmpty()) {
//            return ResponseObject.error("Bạn chưa theo dõi người dùng này");
//        }
//
//        followRepository.delete(existing.get());
//
//        // Update follower's following count
//        Optional<User> follower = userRepository.findById(followerId);
//        if (follower.isPresent()) {
//            User f1 = follower.get();
//            f1.setFollowing(Math.max(0, f1.getFollowing() == null ? 0 : f1.getFollowing() - 1));
//            userRepository.save(f1);
//        }
//
//        // Update followee's followers count
//        Optional<User> followee = userRepository.findById(followeeId);
//        if (followee.isPresent()) {
//            User f2 = followee.get();
//            f2.setFollowers(Math.max(0, f2.getFollowers() == null ? 0 : f2.getFollowers() - 1));
//            userRepository.save(f2);
//        }
//
//        return ResponseObject.success(null, "Đã bỏ theo dõi");
//    }
//
//    @Override
//    public ResponseObject getFollowers(String userId, int page, int size) {
//        // Get all follower IDs
//        List<String> followerIds = followRepository.findByFolloweeId(userId)
//                .stream()
//                .map(Follow::getFollowerId)
//                .collect(Collectors.toList());
//
//        if (followerIds.isEmpty()) {
//            return ResponseObject.success(List.of(), "Chưa có người theo dõi");
//        }
//
//        // Get user details
//        Page<User> followers = userRepository.findByIdIn(followerIds, PageRequest.of(page, size));
//
//        List<UserDTO> followerDTOs = followers.stream()
//                .map(this::convertToDTO)
//                .collect(Collectors.toList());
//
//        return ResponseObject.success(
//                new PageableObject<>(
//                        followerDTOs,
//                        followers.getNumber(),
//                        followers.getSize(),
//                        followers.getTotalElements(),
//                        followers.getTotalPages()
//                ),
//                "OK"
//        );
//    }
//
//
//    @Override
//    public ResponseObject getFollowing(String userId, int page, int size) {
//        // Get all followee IDs
//        List<String> followeeIds = followRepository.findByFollowerId(userId)
//                .stream()
//                .map(Follow::getFolloweeId)
//                .collect(Collectors.toList());
//
//        if (followeeIds.isEmpty()) {
//            return ResponseObject.success(List.of(), "Chưa theo dõi ai");
//        }
//
//        // Get user details
//        Page<User> following = userRepository.findByIdIn(followeeIds, PageRequest.of(page, size));
//
//        List<UserDTO> followingDTOs = following.stream()
//                .map(this::convertToDTO)
//                .collect(Collectors.toList());
//
//        return ResponseObject.success(
//                new com.example.the_autumn.model.response.PageableObject<>(
//                        followingDTOs,
//                        following.getNumber(),
//                        following.getSize(),
//                        following.getTotalElements(),
//                        following.getTotalPages()
//                ),
//                "OK"
//        );
//    }
//
//    @Override
//    public ResponseObject checkFollowStatus(String followerId, String followeeId) {
//        boolean isFollowing = followRepository.existsById(
//                new com.example.the_autumn.entity.FollowId(followerId, followeeId)
//        );
//        return ResponseObject.success(
//                new FollowStatusDTO(isFollowing),
//                "OK"
//        );
//    }
//
//    @Override
//    @Transactional
//    public ResponseObject updateProfile(String userId, UserDTO dto) {
//        Optional<User> maybe = userRepository.findById(userId);
//        if (maybe.isEmpty()) return ResponseObject.error("Không tìm thấy người dùng");
//
//        User user = maybe.get();
//
//        if (dto.getName() != null) user.setName(dto.getName());
//        if (dto.getAvatar() != null) user.setAvatar(dto.getAvatar());
//        if (dto.getBio() != null) user.setBio(dto.getBio());
//        if (dto.getClassName() != null) user.setClassName(dto.getClassName());
//        if (dto.getMajorId() != null) user.setMajorId(dto.getMajorId());
//
//        user.setUpdatedAt(LocalDateTime.now());
//        userRepository.save(user);
//
//        return ResponseObject.success(convertToDTO(user), "Cập nhật thành công");
//    }
//
//    @Override
//    public ResponseObject searchUsers(String keyword, int page, int size) {
//        Page<User> users = userRepository.searchByNameOrEmail(keyword, PageRequest.of(page, size));
//
//        List<UserDTO> userDTOs = users.stream()
//                .map(this::convertToDTO)
//                .collect(Collectors.toList());
//
//        return ResponseObject.success(
//                new com.example.the_autumn.model.response.PageableObject<>(
//                        userDTOs,
//                        users.getNumber(),
//                        users.getSize(),
//                        users.getTotalElements(),
//                        users.getTotalPages()
//                ),
//                "OK"
//        );
//    }
//
//    @Override
//    public ResponseObject getUserStats(String userId) {
//        Optional<User> maybe = userRepository.findById(userId);
//        if (maybe.isEmpty()) return ResponseObject.error("Không tìm thấy người dùng");
//
//        User user = maybe.get();
//
//        // Get post statistics
//        int totalPosts = postRepository.countByAuthorId(userId);
//        int totalViews = postRepository.sumViewsByAuthorId(userId);
//        int totalLikes = postRepository.sumLikesByAuthorId(userId);
//
//        UserStatsDTO stats = new UserStatsDTO();
//        stats.setUserId(userId);
//        stats.setTotalPoints(user.getPoints());
//        stats.setTotalPosts(totalPosts);
//        stats.setTotalViews(totalViews);
//        stats.setTotalLikes(totalLikes);
//        stats.setFollowers(user.getFollowers());
//        stats.setFollowing(user.getFollowing());
//
//        // Get badges count
//        int badgesCount = userBadgeRepository.countByUserId(userId);
//        stats.setBadgesCount(badgesCount);
//
//        return ResponseObject.success(stats, "OK");
//    }
//
//
//    @Override
//    public ResponseObject getPrivacySettings(String userId) {
//        UserPrivacy privacy = userPrivacyRepository.findById(userId).orElseGet(() -> {
//            // Nếu chưa có cấu hình, tạo mặc định
//            return UserPrivacy.builder()
//                    .userId(userId)
//                    .allowMessagesFrom(UserPrivacy.PrivacyLevel.everyone)
//                    .requireApproval(true)
//                    .updatedAt(LocalDateTime.now())
//                    .build();
//        });
//        return ResponseObject.success(privacy, "OK");
//    }
//
//    @Override
//    public ResponseObject updatePrivacySettings(String userId, PrivacySettingsDTO dto) {
//        UserPrivacy privacy = userPrivacyRepository.findById(userId).orElse(new UserPrivacy());
//        privacy.setUserId(userId);
//
//        if (dto.getAllowMessagesFrom() != null) {
//            privacy.setAllowMessagesFrom(UserPrivacy.PrivacyLevel.valueOf(dto.getAllowMessagesFrom()));
//        }
//        if (dto.getRequireApproval() != null) {
//            privacy.setRequireApproval(dto.getRequireApproval());
//        }
//        privacy.setUpdatedAt(LocalDateTime.now());
//
//        userPrivacyRepository.save(privacy);
//        return ResponseObject.success(privacy, "Cập nhật quyền riêng tư thành công");
//    }
//
//    @Override
//    public ResponseObject blockUser(String blockerId, String blockedId) {
//        if (blockerId.equals(blockedId)) return ResponseObject.error("Bạn không thể tự chặn mình");
//
//        boolean exists = blockRepository.existsById(new BlockId(blockerId, blockedId));
//        if (exists) return ResponseObject.error("Bạn đã chặn người này rồi");
//
//        // 1. Lưu bản ghi chặn
//        Block block = Block.builder()
//                .blockerId(blockerId)
//                .blockedId(blockedId)
//                .createdAt(LocalDateTime.now())
//                .build();
//        blockRepository.save(block);
//
//        // 2. Tự động hủy theo dõi 2 chiều (nếu có)
//        unfollowUser(blockerId, blockedId);
//        unfollowUser(blockedId, blockerId);
//
//        return ResponseObject.success(null, "Đã chặn người dùng");
//    }
//
//    @Override
//    public ResponseObject unblockUser(String blockerId, String blockedId) {
//        BlockId blockId = new BlockId(blockerId, blockedId);
//        if (!blockRepository.existsById(blockId)) {
//            return ResponseObject.error("Bạn chưa chặn người dùng này");
//        }
//
//        blockRepository.deleteById(blockId);
//        return ResponseObject.success(null, "Đã bỏ chặn người dùng");
//    }
//
//    @Override
//    public ResponseObject getBlockedUsers(String userId, int page, int size) {
//        List<String> blockedIds = blockRepository.findByBlockerId(userId)
//                .stream()
//                .map(Block::getBlockedId)
//                .collect(Collectors.toList());
//
//        if (blockedIds.isEmpty()) {
//            return ResponseObject.success(List.of(), "Danh sách chặn trống");
//        }
//
//        Page<User> blockedUsers = userRepository.findByIdIn(blockedIds, PageRequest.of(page, size));
//        List<UserDTO> blockedDTOs = blockedUsers.stream()
//                .map(this::convertToDTO)
//                .collect(Collectors.toList());
//
//        return ResponseObject.success(
//                new PageableObject<>(blockedDTOs, blockedUsers.getNumber(), blockedUsers.getSize(),
//                        blockedUsers.getTotalElements(), blockedUsers.getTotalPages()),
//                "OK"
//        );
//    }
//    }
//
//    // Helper methods
//    private UserDTO convertToDTO(User user) {
//        UserDTO dto = new UserDTO();
//        dto.setId(user.getId());
//        dto.setName(user.getName());
//        dto.setEmail(user.getEmail());
//        dto.setAvatar(user.getAvatar());
//        dto.setRole(user.getRole().name());
//        dto.setMajorId(user.getMajorId());
//        dto.setClassName(user.getClassName());
//        dto.setPoints(user.getPoints());
//        dto.setBio(user.getBio());
//        dto.setFollowers(user.getFollowers());
//        dto.setFollowing(user.getFollowing());
//        dto.setPostsCount(user.getPostsCount());
//        dto.setIsActive(user.getIsActive());
//        dto.setCreatedAt(user.getCreatedAt());
//        return dto;
//    }
//
//    private void createNotification(String recipientId, String actorId,
//                                    Notification.NotificationType notificationType, String title,
//                                    String description, String postId, String commentId) {
//        Notification notif = Notification.builder()
//                .id(java.util.UUID.randomUUID().toString())
//                .userId(recipientId)
//                .actorId(actorId)
//                .type(notificationType)
//                .title(title)
//                .description(description)
//                .postId(postId)
//                .commentId(commentId)
//                .isRead(false)
//                .createdAt(LocalDateTime.now())
//                .build();
//        notificationRepository.save(notif);
//    }
//
//    // DTOs
//    public static class FollowStatusDTO {
//        private boolean isFollowing;
//
//        public FollowStatusDTO(boolean isFollowing) {
//            this.isFollowing = isFollowing;
//        }
//
//        public boolean isFollowing() { return isFollowing; }
//        public void setFollowing(boolean following) { isFollowing = following; }
//    }
//
//    public static class UserStatsDTO {
//        private String userId;
//        private Integer totalPoints;
//        private Integer totalPosts;
//        private Integer totalViews;
//        private Integer totalLikes;
//        private Integer followers;
//        private Integer following;
//        private Integer badgesCount;
//
//        // Getters and setters
//        public String getUserId() { return userId; }
//        public void setUserId(String userId) { this.userId = userId; }
//
//        public Integer getTotalPoints() { return totalPoints; }
//        public void setTotalPoints(Integer totalPoints) { this.totalPoints = totalPoints; }
//
//        public Integer getTotalPosts() { return totalPosts; }
//        public void setTotalPosts(Integer totalPosts) { this.totalPosts = totalPosts; }
//
//        public Integer getTotalViews() { return totalViews; }
//        public void setTotalViews(Integer totalViews) { this.totalViews = totalViews; }
//
//        public Integer getTotalLikes() { return totalLikes; }
//        public void setTotalLikes(Integer totalLikes) { this.totalLikes = totalLikes; }
//
//        public Integer getFollowers() { return followers; }
//        public void setFollowers(Integer followers) { this.followers = followers; }
//
//        public Integer getFollowing() { return following; }
//        public void setFollowing(Integer following) { this.following = following; }
//
//        public Integer getBadgesCount() { return badgesCount; }
//        public void setBadgesCount(Integer badgesCount) { this.badgesCount = badgesCount; }
//    }
//}

package com.example.server.service.impl;

import com.example.server.entity.*;
import com.example.server.model.dto.PrivacySettingsDTO;
import com.example.server.model.dto.UserDTO;
import com.example.server.model.response.PageableObject;
import com.example.server.model.response.ResponseObject;
import com.example.server.repository.*;
import com.example.server.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class UserServiceImpl implements UserService {

    @Autowired private UserRepository userRepository;
    @Autowired private FollowRepository followRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private BadgeRepository badgeRepository;
    @Autowired private UserBadgeRepository userBadgeRepository;
    @Autowired private BlockRepository blockRepository;
    @Autowired private UserPrivacyRepository userPrivacyRepository;

    @Override
    public ResponseObject getUserProfile(String id) {
        Optional<User> maybe = userRepository.findById(id);
        if (maybe.isEmpty()) return ResponseObject.error("Không tìm thấy người dùng");

        User u = maybe.get();
        UserDTO dto = convertToDTO(u);

        // Get user's badges
        List<Badge> badges = userBadgeRepository.findByUserId(id).stream()
                .map(ub -> badgeRepository.findById(ub.getBadgeId()).orElse(null))
                .filter(b -> b != null)
                .collect(Collectors.toList());
        dto.setBadges(badges);

        return ResponseObject.success(dto, "OK");
    }

    @Override
    @Transactional
    public ResponseObject followUser(String followerId, String followeeId) {
        if (followerId.equals(followeeId)) {
            return ResponseObject.error("Bạn không thể theo dõi chính mình");
        }

        // KIỂM TRA CHẶN LẪN NHAU (BLOCK)
        if (blockRepository.existsByBlockerIdAndBlockedId(followerId, followeeId) ||
                blockRepository.existsByBlockerIdAndBlockedId(followeeId, followerId)) {
            return ResponseObject.error("Không thể theo dõi người dùng này (Bị chặn)");
        }

        Optional<User> follower = userRepository.findById(followerId);
        Optional<User> followee = userRepository.findById(followeeId);

        if (follower.isEmpty() || followee.isEmpty()) {
            return ResponseObject.error("Không tìm thấy người dùng");
        }

        var existing = followRepository.findById(new FollowId(followerId, followeeId));
        if (existing.isPresent()) {
            return ResponseObject.error("Bạn đã theo dõi người dùng này rồi");
        }

        Follow f = Follow.builder()
                .followerId(followerId)
                .followeeId(followeeId)
                .followedAt(LocalDateTime.now())
                .build();
        followRepository.save(f);

        User f1 = follower.get();
        f1.setFollowing(f1.getFollowing() == null ? 1 : f1.getFollowing() + 1);
        userRepository.save(f1);

        User f2 = followee.get();
        f2.setFollowers(f2.getFollowers() == null ? 1 : f2.getFollowers() + 1);
        userRepository.save(f2);

        createNotification(followeeId, followerId, Notification.NotificationType.follow,
                "Người theo dõi mới", f1.getName() + " đã theo dõi bạn", null, null);

        return ResponseObject.success(null, "Đã theo dõi người dùng");
    }

    @Override
    @Transactional
    public ResponseObject unfollowUser(String followerId, String followeeId) {
        Optional<Follow> existing = followRepository.findById(
                new FollowId(followerId, followeeId)
        );

        if (existing.isEmpty()) {
            return ResponseObject.error("Bạn chưa theo dõi người dùng này");
        }

        followRepository.delete(existing.get());

        // Update follower's following count
        Optional<User> follower = userRepository.findById(followerId);
        if (follower.isPresent()) {
            User f1 = follower.get();
            f1.setFollowing(Math.max(0, f1.getFollowing() == null ? 0 : f1.getFollowing() - 1));
            userRepository.save(f1);
        }

        // Update followee's followers count
        Optional<User> followee = userRepository.findById(followeeId);
        if (followee.isPresent()) {
            User f2 = followee.get();
            f2.setFollowers(Math.max(0, f2.getFollowers() == null ? 0 : f2.getFollowers() - 1));
            userRepository.save(f2);
        }

        return ResponseObject.success(null, "Đã bỏ theo dõi");
    }

    @Override
    public ResponseObject getFollowers(String userId, int page, int size) {
        List<String> followerIds = followRepository.findByFolloweeId(userId)
                .stream()
                .map(Follow::getFollowerId)
                .collect(Collectors.toList());

        if (followerIds.isEmpty()) {
            return ResponseObject.success(List.of(), "Chưa có người theo dõi");
        }

        Page<User> followers = userRepository.findByIdIn(followerIds, PageRequest.of(page, size));
        List<UserDTO> followerDTOs = followers.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return ResponseObject.success(
                new PageableObject<>(followerDTOs, followers.getNumber(), followers.getSize(),
                        followers.getTotalElements(), followers.getTotalPages()),
                "OK"
        );
    }

    @Override
    public ResponseObject getFollowing(String userId, int page, int size) {
        List<String> followeeIds = followRepository.findByFollowerId(userId)
                .stream()
                .map(Follow::getFolloweeId)
                .collect(Collectors.toList());

        if (followeeIds.isEmpty()) {
            return ResponseObject.success(List.of(), "Chưa theo dõi ai");
        }

        Page<User> following = userRepository.findByIdIn(followeeIds, PageRequest.of(page, size));
        List<UserDTO> followingDTOs = following.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return ResponseObject.success(
                new PageableObject<>(followingDTOs, following.getNumber(), following.getSize(),
                        following.getTotalElements(), following.getTotalPages()),
                "OK"
        );
    }

    @Override
    public ResponseObject checkFollowStatus(String followerId, String followeeId) {
        boolean isFollowing = followRepository.existsById(
                new FollowId(followerId, followeeId)
        );
        return ResponseObject.success(new FollowStatusDTO(isFollowing), "OK");
    }

    @Override
    @Transactional
    public ResponseObject updateProfile(String userId, UserDTO dto) {
        Optional<User> maybe = userRepository.findById(userId);
        if (maybe.isEmpty()) return ResponseObject.error("Không tìm thấy người dùng");

        User user = maybe.get();
        if (dto.getName() != null) user.setName(dto.getName());
        if (dto.getAvatar() != null) user.setAvatar(dto.getAvatar());
        if (dto.getBio() != null) user.setBio(dto.getBio());
        if (dto.getClassName() != null) user.setClassName(dto.getClassName());
        if (dto.getMajorId() != null) user.setMajorId(dto.getMajorId());

        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return ResponseObject.success(convertToDTO(user), "Cập nhật thành công");
    }

    @Override
    public ResponseObject searchUsers(String keyword, int page, int size) {
        Page<User> users = userRepository.searchByNameOrEmail(keyword, PageRequest.of(page, size));
        List<UserDTO> userDTOs = users.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return ResponseObject.success(
                new PageableObject<>(userDTOs, users.getNumber(), users.getSize(),
                        users.getTotalElements(), users.getTotalPages()),
                "OK"
        );
    }

    @Override
    public ResponseObject getUserStats(String userId) {
        Optional<User> maybe = userRepository.findById(userId);
        if (maybe.isEmpty()) return ResponseObject.error("Không tìm thấy người dùng");

        User user = maybe.get();
        int totalPosts = postRepository.countByAuthorId(userId);
        int totalViews = postRepository.sumViewsByAuthorId(userId);
        int totalLikes = postRepository.sumLikesByAuthorId(userId);
        int badgesCount = userBadgeRepository.countByUserId(userId);

        UserStatsDTO stats = new UserStatsDTO();
        stats.setUserId(userId);
        stats.setTotalPoints(user.getPoints());
        stats.setTotalPosts(totalPosts);
        stats.setTotalViews(totalViews);
        stats.setTotalLikes(totalLikes);
        stats.setFollowers(user.getFollowers());
        stats.setFollowing(user.getFollowing());
        stats.setBadgesCount(badgesCount);

        return ResponseObject.success(stats, "OK");
    }

    @Override
    public ResponseObject getPrivacySettings(String userId) {
        UserPrivacy privacy = userPrivacyRepository.findById(userId).orElseGet(() -> {
            return UserPrivacy.builder()
                    .userId(userId)
                    .allowMessagesFrom(UserPrivacy.PrivacyLevel.everyone)
                    .requireApproval(true)
                    .updatedAt(LocalDateTime.now())
                    .build();
        });
        return ResponseObject.success(privacy, "OK");
    }

    @Override
    public ResponseObject updatePrivacySettings(String userId, PrivacySettingsDTO dto) {
        UserPrivacy privacy = userPrivacyRepository.findById(userId).orElse(new UserPrivacy());
        privacy.setUserId(userId);

        if (dto.getAllowMessagesFrom() != null) {
            privacy.setAllowMessagesFrom(UserPrivacy.PrivacyLevel.valueOf(dto.getAllowMessagesFrom()));
        }
        if (dto.getRequireApproval() != null) {
            privacy.setRequireApproval(dto.getRequireApproval());
        }
        privacy.setUpdatedAt(LocalDateTime.now());

        userPrivacyRepository.save(privacy);
        return ResponseObject.success(privacy, "Cập nhật quyền riêng tư thành công");
    }

    @Override
    @Transactional
    public ResponseObject blockUser(String blockerId, String blockedId) {
        if (blockerId.equals(blockedId)) return ResponseObject.error("Bạn không thể tự chặn mình");

        boolean exists = blockRepository.existsById(new BlockId(blockerId, blockedId));
        if (exists) return ResponseObject.error("Bạn đã chặn người này rồi");

        // 1. Lưu bản ghi chặn
        Block block = Block.builder()
                .blockerId(blockerId)
                .blockedId(blockedId)
                .createdAt(LocalDateTime.now())
                .build();
        blockRepository.save(block);

        // 2. Tự động hủy theo dõi 2 chiều (nếu có)
        unfollowUser(blockerId, blockedId);
        unfollowUser(blockedId, blockerId);

        return ResponseObject.success(null, "Đã chặn người dùng");
    }

    @Override
    @Transactional
    public ResponseObject unblockUser(String blockerId, String blockedId) {
        BlockId blockId = new BlockId(blockerId, blockedId);
        if (!blockRepository.existsById(blockId)) {
            return ResponseObject.error("Bạn chưa chặn người dùng này");
        }

        blockRepository.deleteById(blockId);
        return ResponseObject.success(null, "Đã bỏ chặn người dùng");
    }

    @Override
    public ResponseObject getBlockedUsers(String userId, int page, int size) {
        List<String> blockedIds = blockRepository.findByBlockerId(userId)
                .stream()
                .map(Block::getBlockedId)
                .collect(Collectors.toList());

        if (blockedIds.isEmpty()) {
            return ResponseObject.success(List.of(), "Danh sách chặn trống");
        }

        Page<User> blockedUsers = userRepository.findByIdIn(blockedIds, PageRequest.of(page, size));
        List<UserDTO> blockedDTOs = blockedUsers.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return ResponseObject.success(
                new PageableObject<>(blockedDTOs, blockedUsers.getNumber(), blockedUsers.getSize(),
                        blockedUsers.getTotalElements(), blockedUsers.getTotalPages()),
                "OK"
        );
    }

    // =========================================
    // HELPER METHODS
    // =========================================
    private UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setAvatar(user.getAvatar());
        dto.setRole(user.getRole().name());
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

    private void createNotification(String recipientId, String actorId,
                                    Notification.NotificationType notificationType, String title,
                                    String description, String postId, String commentId) {
        Notification notif = Notification.builder()
                .id(java.util.UUID.randomUUID().toString())
                .userId(recipientId)
                .actorId(actorId)
                .type(notificationType)
                .title(title)
                .description(description)
                .postId(postId)
                .commentId(commentId)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notif);
    }

    // =========================================
    // DTOs
    // =========================================
    public static class FollowStatusDTO {
        private boolean isFollowing;

        public FollowStatusDTO(boolean isFollowing) {
            this.isFollowing = isFollowing;
        }

        public boolean isFollowing() { return isFollowing; }
        public void setFollowing(boolean following) { isFollowing = following; }
    }

    public static class UserStatsDTO {
        private String userId;
        private Integer totalPoints;
        private Integer totalPosts;
        private Integer totalViews;
        private Integer totalLikes;
        private Integer followers;
        private Integer following;
        private Integer badgesCount;

        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }

        public Integer getTotalPoints() { return totalPoints; }
        public void setTotalPoints(Integer totalPoints) { this.totalPoints = totalPoints; }

        public Integer getTotalPosts() { return totalPosts; }
        public void setTotalPosts(Integer totalPosts) { this.totalPosts = totalPosts; }

        public Integer getTotalViews() { return totalViews; }
        public void setTotalViews(Integer totalViews) { this.totalViews = totalViews; }

        public Integer getTotalLikes() { return totalLikes; }
        public void setTotalLikes(Integer totalLikes) { this.totalLikes = totalLikes; }

        public Integer getFollowers() { return followers; }
        public void setFollowers(Integer followers) { this.followers = followers; }

        public Integer getFollowing() { return following; }
        public void setFollowing(Integer following) { this.following = following; }

        public Integer getBadgesCount() { return badgesCount; }
        public void setBadgesCount(Integer badgesCount) { this.badgesCount = badgesCount; }
    }
}