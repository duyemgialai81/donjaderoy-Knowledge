package com.example.server.service.impl;

import com.example.server.entity.Comment;
import com.example.server.entity.Post;
import com.example.server.model.dto.CommentDTO;
import com.example.server.model.response.ResponseObject;
import com.example.server.repository.CommentRepository;
import com.example.server.repository.PostRepository;
import com.example.server.service.CommentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class CommentServiceImpl implements CommentService {

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private PostRepository postRepository;

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

        return ResponseObject.success(savedComment, "Comment added");
    }

    @Override
    public ResponseObject listByPost(String postId) {
        var list = commentRepository.findByPostIdOrderByCreatedAtDesc(postId);
        return ResponseObject.success(list, "OK");
    }

    @Override
    public ResponseObject listReplies(String commentId) {
        var list = commentRepository.findByParentIdOrderByCreatedAtAsc(commentId);
        return ResponseObject.success(list, "OK");
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

        commentRepository.delete(comment);

        // Trừ đi số lượng comment của bài viết
        Optional<Post> postOpt = postRepository.findById(postId);
        if(postOpt.isPresent()) {
            Post p = postOpt.get();
            p.setCommentsCount(Math.max(0, p.getCommentsCount() - 1));
            postRepository.save(p);
        }

        // 📢 LOA THÔNG BÁO: Bắn sự kiện XÓA BÌNH LUẬN (Gửi ID của comment bị xóa)
        try {
            messagingTemplate.convertAndSend("/topic/post/" + postId + "/delete-comment", commentId);
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
}