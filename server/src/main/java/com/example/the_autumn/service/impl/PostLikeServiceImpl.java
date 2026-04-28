package com.example.the_autumn.service.impl;

import com.example.the_autumn.entity.*;
import com.example.the_autumn.model.dto.LikeStatusDTO;
import com.example.the_autumn.model.response.ResponseObject;
import com.example.the_autumn.repository.*; // Import tất cả các repo cần thiết
import com.example.the_autumn.service.PostLikeService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate; // 👈 IMPORT LOA THÔNG BÁO
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PostLikeServiceImpl implements PostLikeService {
    @Autowired private PostRepository postRepository;
    @Autowired private PostLikeRepository postLikeRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private LeaderboardRepository leaderboardRepository;
    @Autowired private BadgeRepository badgeRepository;
    @Autowired private UserBadgeRepository userBadgeRepository;

    // 👇 Tiêm STOMP Loa Thông Báo
    @Autowired private SimpMessagingTemplate messagingTemplate;

    // Constant
    private static final int POINTS_LIKE = 3;

    @Override
    @Transactional
    public ResponseObject getPostLikesCount(String postId) {
        long count = postLikeRepository.countByPostId(postId);
        return new ResponseObject<>(count, "Tổng số lượt thích");
    }

    @Override
    @Transactional
    public ResponseObject checkLikeStatus(String postId, String userId) {
        boolean isLiked = postLikeRepository.existsByPostIdAndUserId(postId, userId);
        return new ResponseObject<>(new LikeStatusDTO(isLiked), "Trạng thái like");
    }

// ============================================================
// HÀM LIKE POST (ĐÃ GẮN STOMP)
// ============================================================

    @Override
    @Transactional
    public ResponseObject likePost(String postId, String userId) {
        Optional<Post> p = postRepository.findById(postId);
        if (p.isEmpty()) return ResponseObject.error("Không tìm thấy bài viết");

        if (postLikeRepository.existsByPostIdAndUserId(postId, userId)) {
            return ResponseObject.error("Bạn đã thích bài viết này rồi");
        }

        PostLike like = PostLike.builder()
                .postId(postId)
                .userId(userId)
                .createdAt(LocalDateTime.now())
                .build();
        postLikeRepository.save(like);

        Post post = p.get();
        // Tăng đếm Like
        int newLikesCount = (post.getLikesCount() == null ? 0 : post.getLikesCount()) + 1;
        post.setLikesCount(newLikesCount);
        postRepository.save(post);

        // 📢 LOA STOMP: Phát ngay tổng số Like MỚI cho mọi người đang xem bài viết này
        try {
            messagingTemplate.convertAndSend("/topic/post/" + postId + "/likes", newLikesCount);
            System.out.println("❤️ [STOMP] Bài viết " + postId + " vừa lên " + newLikesCount + " Likes");
        } catch (Exception e) {
            System.out.println("❌ Lỗi khi gửi thông báo Like bài viết qua STOMP: " + e.getMessage());
        }

        String authorId = post.getAuthorId();
        if (!authorId.equals(userId)) {
            awardPointsToUser(authorId, POINTS_LIKE, "Nhận like");

            createNotification(
                    authorId,
                    userId,
                    Notification.NotificationType.like,
                    "Bài viết của bạn nhận được lượt thích",
                    null,
                    postId,
                    null
            );
        }

        return ResponseObject.success(null, "Đã thích bài viết");
    }

// ============================================================
// HÀM UNLIKE POST (ĐÃ GẮN STOMP)
// ============================================================

    @Override
    @Transactional
    public ResponseObject unlikePost(String postId, String userId) {
        Optional<Post> p = postRepository.findById(postId);
        if (p.isEmpty()) return ResponseObject.error("Không tìm thấy bài viết");

        List<PostLike> likes = postLikeRepository.findByPostIdAndUserId(postId, userId);

        if (likes.isEmpty()) return ResponseObject.error("Bạn chưa thích bài viết này");

        postLikeRepository.deleteAll(likes);

        Post post = p.get();
        // Giảm đếm Like (không bao giờ được âm)
        int newLikesCount = Math.max(0, (post.getLikesCount() == null ? 0 : post.getLikesCount()) - 1);
        post.setLikesCount(newLikesCount);
        postRepository.save(post);

        // 📢 LOA STOMP: Phát ngay tổng số Like MỚI (Bị giảm đi)
        try {
            messagingTemplate.convertAndSend("/topic/post/" + postId + "/likes", newLikesCount);
            System.out.println("💔 [STOMP] Bài viết " + postId + " vừa rớt xuống " + newLikesCount + " Likes");
        } catch (Exception e) {
            System.out.println("❌ Lỗi khi gửi thông báo Bỏ Like bài viết qua STOMP: " + e.getMessage());
        }

        String authorId = post.getAuthorId();
        if (!authorId.equals(userId)) {
            deductPointsFromUser(authorId, POINTS_LIKE, "Bỏ like");
        }

        return ResponseObject.success(null, "Đã bỏ thích");
    }

    // ============================================================
// HÀM HELPER
// ============================================================
    private void awardPointsToUser(String userId, int points, String reason) {
        userRepository.findById(userId).ifPresent(user -> {
            int currentPoints = user.getPoints() == null ? 0 : user.getPoints();
            user.setPoints(currentPoints + points);
            userRepository.save(user);
            updateLeaderboard(user); // Cập nhật Leaderboard
            checkAndAwardBadges(userId); // Kiểm tra và tặng huy hiệu
        });
    }

    private void deductPointsFromUser(String userId, int points, String reason) {
        userRepository.findById(userId).ifPresent(user -> {
            int currentPoints = user.getPoints() == null ? 0 : user.getPoints();
            user.setPoints(Math.max(0, currentPoints - points));
            userRepository.save(user);
            updateLeaderboard(user); // Cập nhật Leaderboard
        });
    }

    private void createNotification(String recipientId, String actorId,
                                    Notification.NotificationType type, String title,
                                    String description, String postId, String commentId) {
        Notification notif = Notification.builder()
                .id(UUID.randomUUID().toString())
                .userId(recipientId)
                .actorId(actorId)
                .type(type)
                .title(title)
                .description(description)
                .postId(postId)
                .commentId(commentId)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notif);
    }

    private void updateLeaderboard(User user) {
        Optional<Leaderboard> existing = leaderboardRepository.findByUserId(user.getId());

        if (existing.isPresent()) {
            Leaderboard lb = existing.get();
            lb.setPoints(user.getPoints());
            leaderboardRepository.save(lb);
        } else {
            Leaderboard lb = Leaderboard.builder()
                    .userId(user.getId())
                    .points(user.getPoints())
                    .postsThisWeek(0)
                    .build();
            leaderboardRepository.save(lb);
        }
        recalculateLeaderboardRanks();
    }

    private void recalculateLeaderboardRanks() {
        List<Leaderboard> all = leaderboardRepository.findAllByOrderByPointsDesc();
        int rank = 1;
        for (Leaderboard lb : all) {
            lb.setRankNo(rank++);
            leaderboardRepository.save(lb);
        }
    }

    private void checkAndAwardBadges(String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return;

        User user = userOpt.get();
        int points = user.getPoints() == null ? 0 : user.getPoints();
        List<Badge> allBadges = badgeRepository.findAll();

        for (Badge badge : allBadges) {
            if (points >= badge.getRequiredPoints()) {
                boolean hasBadge = userBadgeRepository.existsByUserIdAndBadgeId(userId, badge.getId());

                if (!hasBadge) {
                    UserBadge ub = UserBadge.builder()
                            .userId(userId)
                            .badgeId(badge.getId())
                            .awardedAt(LocalDateTime.now())
                            .build();
                    userBadgeRepository.save(ub);

                    createNotification(
                            userId, null, Notification.NotificationType.badge,
                            "Chúc mừng! Bạn nhận được huy hiệu mới",
                            "Bạn đã nhận được huy hiệu: " + badge.getName(),
                            null, null
                    );
                }
            }
        }
    }
}