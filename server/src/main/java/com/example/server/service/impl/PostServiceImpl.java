package com.example.server.service.impl;

import com.example.server.entity.*;
import com.example.server.model.dto.PostDTO;
import com.example.server.model.response.ResponseObject;
import com.example.server.repository.*;
import com.example.server.service.PostService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class PostServiceImpl implements PostService {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private PostLikeRepository postLikeRepository;

    @Autowired
    private TagRepository tagRepository;

    @Autowired
    private PostTagRepository postTagRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private LeaderboardRepository leaderboardRepository;

    @Autowired
    private BadgeRepository badgeRepository;

    @Autowired
    private UserBadgeRepository userBadgeRepository;

    @Autowired
    private AttachmentRepository attachmentRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private static final int POINTS_POST = 10;
    private static final int POINTS_LIKE = 3;
    private static final int MAX_PAGE_SIZE = 50;

    @Override
    @Transactional
    public ResponseObject createPost(PostDTO postDTO, String authUserId) {
        // Create post
        Post p = new Post();
        p.setId(postDTO.getId() == null ? UUID.randomUUID().toString() : postDTO.getId());
        p.setTitle(postDTO.getTitle());
        p.setContent(postDTO.getContent());
        p.setAuthorId(authUserId); // Use authenticated user
        p.setMajorId(postDTO.getMajorId());
        p.setSubjectId(postDTO.getSubjectId());
        p.setTopic(postDTO.getTopic());
        p.setStatus(Post.Status.valueOf(postDTO.getStatus() == null ? "published" : postDTO.getStatus()));
        p.setCreatedAt(LocalDateTime.now());
        p.setUpdatedAt(LocalDateTime.now());
        p.setViews(0);
        p.setLikesCount(0);
        p.setCommentsCount(0);
        p.setVideoUrl(postDTO.getVideoUrl());

        Post saved = postRepository.save(p);

        // Add tags
        if (postDTO.getTags() != null && !postDTO.getTags().isEmpty()) {
            Set<Tag> tagsToAdd = new HashSet<>();
            for (String tagName : postDTO.getTags()) {
                Tag tag = tagRepository.findByName(tagName).orElseGet(() -> {
                    Tag t = Tag.builder()
                            .name(tagName)
                            .createdAt(LocalDateTime.now())
                            .build();
                    return tagRepository.save(t);
                });
                tagsToAdd.add(tag);
            }

            for (Tag t : tagsToAdd) {
                PostTag pt = PostTag.builder()
                        .postId(saved.getId())
                        .tagId(t.getId())
                        .build();
                if (postTagRepository.findByPostId(saved.getId()).stream()
                        .noneMatch(x -> x.getTagId().equals(t.getId()))) {
                    postTagRepository.save(pt);
                }
            }
        }

        if (postDTO.getAttachments() != null && !postDTO.getAttachments().isEmpty()) {
            List<Attachment> savedAttachments = new ArrayList<>();
            for (PostDTO.AttachmentDTO attachmentDTO : postDTO.getAttachments()) {
                if (attachmentDTO.getUrl() == null || attachmentDTO.getUrl().isBlank()) continue;
                Attachment attachment = attachmentRepository.save(Attachment.builder()
                        .id(UUID.randomUUID().toString())
                        .postId(saved.getId())
                        .name(attachmentDTO.getName())
                        .type(attachmentDTO.getType())
                        .size(attachmentDTO.getSize())
                        .url(attachmentDTO.getUrl())
                        .createdAt(LocalDateTime.now())
                        .build());
                savedAttachments.add(attachment);
            }
            saved.setAttachments(savedAttachments);
        }

        // Award points for creating post (+10 points)
        awardPointsToUser(authUserId, POINTS_POST, "Tạo bài viết");

        // Update user posts_count
        userRepository.findById(authUserId).ifPresent(user -> {
            user.setPostsCount((user.getPostsCount() == null ? 0 : user.getPostsCount()) + 1);
            userRepository.save(user);
        });

        // Check and award badges
        checkAndAwardBadges(authUserId);

        return ResponseObject.success(saved, "Bài viết đã được tạo và bạn nhận được " + POINTS_POST + " điểm");
    }

    @Override
    @Transactional
    public ResponseObject getPostById(String id) {
        Optional<Post> maybe = postRepository.findById(id);
        if (maybe.isEmpty()) return ResponseObject.error("Không tìm thấy bài viết");

        Post post = maybe.get();
        postRepository.incrementViews(id);
        post.setViews((post.getViews() == null ? 0 : post.getViews()) + 1);
        post.setAttachments(attachmentRepository.findByPostId(id));
        broadcastViewsCount(id, post.getViews());

        return ResponseObject.success(post, "OK");
    }

    @Override
    public ResponseObject listPosts(int page, int size, String majorId, String topic) {
        Page<Post> posts;
        PageRequest pageRequest = PageRequest.of(normalizePage(page), normalizeSize(size));

        if (majorId != null && !majorId.isEmpty()) {
            posts = postRepository.findByMajorIdAndStatusOrderByCreatedAtDesc(majorId, Post.Status.published, pageRequest);
        } else if (topic != null && !topic.isEmpty()) {
            posts = postRepository.findByTopicAndStatusOrderByCreatedAtDesc(topic, Post.Status.published, pageRequest);
        } else {
            posts = postRepository.findByStatusOrderByCreatedAtDesc(Post.Status.published, pageRequest);
        }
        posts.getContent().forEach(post -> post.setAttachments(attachmentRepository.findByPostId(post.getId())));

        return ResponseObject.success(
                new com.example.server.model.response.PageableObject<>(posts),
                "OK"
        );
    }

//    @Override
//    @Transactional
//    public ResponseObject likePost(String postId, String userId) {
//        Optional<Post> p = postRepository.findById(postId);
//        if (p.isEmpty()) return ResponseObject.error("Không tìm thấy bài viết");
//
//        // Check if already liked
//        if (postLikeRepository.existsByPostIdAndUserId(postId, userId)) {
//            return ResponseObject.error("Bạn đã thích bài viết này rồi");
//        }
//
//        // Create like
//        PostLike like = PostLike.builder()
//                .postId(postId)
//                .userId(userId)
//                .createdAt(LocalDateTime.now())
//                .build();
//        postLikeRepository.save(like);
//
//        // Update post likes count
//        Post post = p.get();
//        post.setLikesCount((post.getLikesCount() == null ? 0 : post.getLikesCount()) + 1);
//        postRepository.save(post);
//
//        // Award points to post author (+3 points for receiving like)
//        String authorId = post.getAuthorId();
//        if (!authorId.equals(userId)) { // Don't award points for self-like
//            awardPointsToUser(authorId, POINTS_LIKE, "Nhận like");
//
//            // Create notification for post author
//            createNotification(
//                    authorId,
//                    userId,
//                    Notification.NotificationType.like,
//                    "Bài viết của bạn nhận được lượt thích",
//                    null,
//                    postId,
//                    null
//            );
//        }
//        return ResponseObject.success(null, "Đã thích bài viết");
//    }
//
//    @Override
//    @Transactional
//    public ResponseObject unlikePost(String postId, String userId) {
//        Optional<Post> p = postRepository.findById(postId);
//        if (p.isEmpty()) return ResponseObject.error("Không tìm thấy bài viết");
//
//        List<PostLike> likes = postLikeRepository.findByPostId(postId).stream()
//                .filter(l -> l.getUserId().equals(userId))
//                .collect(Collectors.toList());
//
//        if (likes.isEmpty()) return ResponseObject.error("Bạn chưa thích bài viết này");
//        postLikeRepository.delete(likes.get(0));
//        // Update post likes count
//        Post post = p.get();
//        post.setLikesCount(Math.max(0, (post.getLikesCount() == null ? 0 : post.getLikesCount()) - 1));
//        postRepository.save(post);
//        // Deduct points from post author
//        String authorId = post.getAuthorId();
//        if (!authorId.equals(userId)) {
//            deductPointsFromUser(authorId, POINTS_LIKE, "Bỏ like");
//        }
//        return ResponseObject.success(null, "Đã bỏ thích");
//    }
    @Override
    public ResponseObject getTagsForPost(String postId) {
        var pts = postTagRepository.findByPostId(postId);
        var tags = pts.stream()
                .map(pt -> tagRepository.findById(pt.getTagId()).orElse(null))
                .filter(t -> t != null)
                .toList();
        return ResponseObject.success(tags, "OK");
    }

    @Override
    public ResponseObject getPostsByUser(String userId, int page, int size) {
        Page<Post> posts = postRepository.findByAuthorIdOrderByCreatedAtDesc(
                userId,
                PageRequest.of(normalizePage(page), normalizeSize(size))
        );
        return ResponseObject.success(
                new com.example.server.model.response.PageableObject<>(posts),
                "OK"
        );
    }

    @Override
    @Transactional
    public ResponseObject deletePost(String postId, String userId) {
        Optional<Post> maybe = postRepository.findById(postId);
        if (maybe.isEmpty()) return ResponseObject.error("Không tìm thấy bài viết");

        Post post = maybe.get();
        if (!post.getAuthorId().equals(userId)) {
            return ResponseObject.error("Bạn không có quyền xóa bài viết này");
        }

        // Deduct points
        deductPointsFromUser(userId, POINTS_POST, "Xóa bài viết");

        // Update user posts_count
        userRepository.findById(userId).ifPresent(user -> {
            user.setPostsCount(Math.max(0, (user.getPostsCount() == null ? 0 : user.getPostsCount()) - 1));
            userRepository.save(user);
        });

        postRepository.delete(post);
        return ResponseObject.success(null, "Đã xóa bài viết");
    }

    // Helper method to award points
    private void awardPointsToUser(String userId, int points, String reason) {
        userRepository.findById(userId).ifPresent(user -> {
            int currentPoints = user.getPoints() == null ? 0 : user.getPoints();
            user.setPoints(currentPoints + points);
            userRepository.save(user);

            // Update leaderboard
            updateLeaderboard(user);
        });
    }

    // Helper method to deduct points
    private void deductPointsFromUser(String userId, int points, String reason) {
        userRepository.findById(userId).ifPresent(user -> {
            int currentPoints = user.getPoints() == null ? 0 : user.getPoints();
            user.setPoints(Math.max(0, currentPoints - points));
            userRepository.save(user);

            // Update leaderboard
            updateLeaderboard(user);
        });
    }

    // Create notification
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
        try {
            messagingTemplate.convertAndSendToUser(recipientId, "/queue/notifications", notif);
        } catch (Exception e) {
            System.out.println("[STOMP] Khong the gui thong bao post: " + e.getMessage());
        }
    }

    // Update leaderboard
    private void updateLeaderboard(User user) {
        // Find or create leaderboard entry
        Optional<Leaderboard> existing = findPrimaryLeaderboard(user.getId());

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

        // Do not recalculate every rank on each write; that becomes O(n) at large scale.
        // Leaderboard refresh can run as a batch job or through the dedicated admin update endpoint.
    }

    private Optional<Leaderboard> findPrimaryLeaderboard(String userId) {
        List<Leaderboard> rows = leaderboardRepository.findAllByUserIdOrderByIdAsc(userId);
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        if (rows.size() > 1) {
            leaderboardRepository.deleteAll(rows.subList(1, rows.size()));
        }
        return Optional.of(rows.get(0));
    }

    // Recalculate all ranks
    private void recalculateLeaderboardRanks() {
        // Disabled for request path safety. Re-ranking every row is O(n) and
        // must run only from a controlled background/admin job.
    }

    // Check and award badges based on points
    private void checkAndAwardBadges(String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return;

        User user = userOpt.get();
        int points = user.getPoints() == null ? 0 : user.getPoints();

        // Get all badges
        List<Badge> allBadges = badgeRepository.findAll();

        for (Badge badge : allBadges) {
            if (points >= badge.getRequiredPoints()) {
                // Check if user already has this badge
                boolean hasBadge = userBadgeRepository.existsByUserIdAndBadgeId(userId, badge.getId());

                if (!hasBadge) {
                    // Award badge
                    UserBadge ub = UserBadge.builder()
                            .userId(userId)
                            .badgeId(badge.getId())
                            .awardedAt(LocalDateTime.now())
                            .build();
                    userBadgeRepository.save(ub);

                    // Create notification
                    createNotification(
                            userId,
                            null,
                            Notification.NotificationType.badge,
                            "Chúc mừng! Bạn nhận được huy hiệu mới",
                            "Bạn đã nhận được huy hiệu: " + badge.getName(),
                            null,
                            null
                    );
                }
            }
        }
    }

    private int normalizePage(int page) {
        return Math.max(0, page);
    }

    private int normalizeSize(int size) {
        if (size <= 0) {
            return 10;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private void broadcastViewsCount(String postId, int viewsCount) {
        try {
            messagingTemplate.convertAndSend("/topic/post/" + postId + "/views", String.valueOf(Math.max(0, viewsCount)));
        } catch (Exception ignored) {
        }
    }
}
