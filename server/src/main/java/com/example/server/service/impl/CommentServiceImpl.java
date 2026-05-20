package com.example.server.service.impl;

import com.example.server.entity.Comment;
import com.example.server.entity.Notification;
import com.example.server.entity.Post;
import com.example.server.model.dto.CommentDTO;
import com.example.server.model.response.ResponseObject;
import com.example.server.repository.CommentRepository;
import com.example.server.repository.NotificationRepository;
import com.example.server.repository.PostRepository;
import com.example.server.service.CommentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class CommentServiceImpl implements CommentService {
    private static final int MAX_PAGE_SIZE = 100;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    // Tiêm (Inject) cái loa để bắn Realtime qua WebSockets
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Override
    public ResponseObject addComment(CommentDTO dto) {
        Optional<Post> maybe = postRepository.findById(dto.getPostId());
        if (maybe.isEmpty()) return ResponseObject.error("Post not found");

        Comment c = Comment.builder()
                .id(dto.getId() == null ? UUID.randomUUID().toString() : dto.getId())
                .postId(dto.getPostId())
                .authorId(dto.getAuthorId())
                .content(dto.getContent())
                .parentId(dto.getParentId()) // Nếu là reply thì sẽ có parentId
                .createdAt(LocalDateTime.now())
                .likes(0)
                .isReported(false)
                .build();

        Comment savedComment = commentRepository.save(c);

        Post p = maybe.get();
        p.setCommentsCount((p.getCommentsCount() == null ? 0 : p.getCommentsCount()) + 1);
        postRepository.save(p);

        // 📢 LOA THÔNG BÁO: Bắn sự kiện CÓ BÌNH LUẬN MỚI
        try {
            messagingTemplate.convertAndSend("/topic/post/" + p.getId() + "/new-comment", savedComment);
            System.out.println("✅ [STOMP] Đã phát thông báo BÌNH LUẬN MỚI cho bài: " + p.getId());
        } catch (Exception e) {
            System.out.println("❌ [STOMP] Lỗi khi phát thông báo bình luận mới!");
            e.printStackTrace();
        }

        createCommentNotification(p, savedComment);

        return ResponseObject.success(savedComment, "Comment added");
    }

    @Override
    public ResponseObject listByPost(String postId, int page, int size) {
        Page<Comment> comments = commentRepository.findByPostIdOrderByCreatedAtDesc(
                postId,
                PageRequest.of(normalizePage(page), normalizeSize(size))
        );
        return ResponseObject.success(
                new com.example.server.model.response.PageableObject<>(comments),
                "OK"
        );
    }

    @Override
    public ResponseObject listReplies(String commentId, int page, int size) {
        Page<Comment> replies = commentRepository.findByParentIdOrderByCreatedAtAsc(
                commentId,
                PageRequest.of(normalizePage(page), normalizeSize(size))
        );
        return ResponseObject.success(
                new com.example.server.model.response.PageableObject<>(replies),
                "OK"
        );
    }

    @Override
    public ResponseObject updateComment(String commentId, String userId, String content) {
        Optional<Comment> commentOpt = commentRepository.findById(commentId);
        if (commentOpt.isEmpty()) return ResponseObject.error("Comment not found");

        String nextContent = content == null ? "" : content.trim();
        if (nextContent.isEmpty()) return ResponseObject.error("Content is required");

        Comment comment = commentOpt.get();
        if (!comment.getAuthorId().equals(userId)) {
            return ResponseObject.error("You don't have permission to edit this comment");
        }

        comment.setContent(nextContent);
        Comment updatedComment = commentRepository.save(comment);
        try {
            messagingTemplate.convertAndSend("/topic/post/" + updatedComment.getPostId() + "/update-comment", updatedComment);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return ResponseObject.success(updatedComment, "Comment updated successfully");
    }

    @Override
    public ResponseObject deleteComment(String commentId, String userId) {
        Optional<Comment> commentOpt = commentRepository.findById(commentId);
        if (commentOpt.isEmpty()) return ResponseObject.error("Comment not found");

        Comment comment = commentOpt.get();
        String postId = comment.getPostId();

        // Kiểm tra quyền xóa
        if (!comment.getAuthorId().equals(userId)) {
            return ResponseObject.error("You don't have permission to delete this comment");
        }

        List<Comment> descendants = collectDescendants(commentId);
        if (!descendants.isEmpty()) {
            Collections.reverse(descendants);
            commentRepository.deleteAll(descendants);
        }
        commentRepository.delete(comment);

        // Trừ đi số lượng comment của bài viết
        Optional<Post> postOpt = postRepository.findById(postId);
        if(postOpt.isPresent()) {
            Post p = postOpt.get();
            int currentCount = p.getCommentsCount() == null ? 0 : p.getCommentsCount();
            p.setCommentsCount(Math.max(0, currentCount - 1 - descendants.size()));
            postRepository.save(p);
        }

        // 📢 LOA THÔNG BÁO: Bắn sự kiện XÓA BÌNH LUẬN (Gửi ID của comment bị xóa)
        try {
            messagingTemplate.convertAndSend("/topic/post/" + postId + "/delete-comment", Map.of(
                    "id", commentId,
                    "deletedCount", 1 + descendants.size()
            ));
            System.out.println("🗑️ [STOMP] Đã phát thông báo XÓA bình luận: " + commentId);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseObject.success(null, "Comment deleted successfully");
    }

    @Override
    public ResponseObject likeComment(String commentId, String userId) {
        Optional<Comment> commentOpt = commentRepository.findById(commentId);
        if (commentOpt.isEmpty()) return ResponseObject.error("Comment not found");

        Comment comment = commentOpt.get();
        comment.setLikes(comment.getLikes() + 1);
        Comment updatedComment = commentRepository.save(comment);
        try {
            messagingTemplate.convertAndSend("/topic/post/" + updatedComment.getPostId() + "/update-comment", updatedComment);
            System.out.println("[STOMP] Đã phát thông báo UPDATE LIKE cho bình luận: " + commentId);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseObject.success(updatedComment, "Comment liked");
    }

    @Override
    public ResponseObject reportComment(String commentId, String userId, String reason) {
        Optional<Comment> commentOpt = commentRepository.findById(commentId);
        if (commentOpt.isEmpty()) return ResponseObject.error("Comment not found");

        Comment comment = commentOpt.get();
        comment.setIsReported(true);
        commentRepository.save(comment);

        return ResponseObject.success(comment, "Comment reported");
    }

    private int normalizePage(int page) {
        return Math.max(0, page);
    }

    private void createCommentNotification(Post post, Comment comment) {
        String actorId = comment.getAuthorId();
        String recipientId = post.getAuthorId();
        String title = "Bài viết của bạn có bình luận mới";

        if (hasText(comment.getParentId())) {
            Optional<Comment> parent = commentRepository.findById(comment.getParentId());
            if (parent.isPresent()) {
                recipientId = parent.get().getAuthorId();
                title = "Có người trả lời bình luận của bạn";
            }
        }

        if (!hasText(recipientId) || recipientId.equals(actorId)) {
            return;
        }

        Notification notification = Notification.builder()
                .id(UUID.randomUUID().toString())
                .userId(recipientId)
                .actorId(actorId)
                .type(Notification.NotificationType.comment)
                .title(title)
                .description(comment.getContent())
                .postId(post.getId())
                .commentId(comment.getId())
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        notificationRepository.save(notification);

        try {
            messagingTemplate.convertAndSendToUser(recipientId, "/queue/notifications", notification);
        } catch (Exception e) {
            System.out.println("[STOMP] Khong the gui thong bao comment: " + e.getMessage());
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private List<Comment> collectDescendants(String parentId) {
        List<Comment> result = new ArrayList<>();
        List<Comment> children = commentRepository.findByParentId(parentId);
        for (Comment child : children) {
            result.add(child);
            result.addAll(collectDescendants(child.getId()));
        }
        return result;
    }

    private int normalizeSize(int size) {
        if (size <= 0) {
            return 20;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
