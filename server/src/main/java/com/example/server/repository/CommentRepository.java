package com.example.server.repository;

import com.example.server.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, String> {
    // Hàm này (mình vừa thêm) để lấy comment gốc của bài viết và xếp MỚI NHẤT LÊN ĐẦU
    List<Comment> findByPostIdOrderByCreatedAtDesc(String postId);

    // Các hàm cũ của bạn giữ nguyên
    List<Comment> findByPostId(String postId);
    List<Comment> findByParentId(String parentId);
    List<Comment> findByAuthorId(String authorId);

    // Hàm này dùng để xếp các comment trả lời (reply) theo thứ tự thời gian đọc cho thuận mắt
    List<Comment> findByParentIdOrderByCreatedAtAsc(String parentId);
}
