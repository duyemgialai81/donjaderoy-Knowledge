package com.example.server.repository;

import com.example.server.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    List<PostLike> findByPostId(String postId);
    boolean existsByPostIdAndUserId(String postId, String userId);
    long countByPostId(String postId);
    // 3. Tìm kiếm theo postId và userId để xóa (unlike)
    List<PostLike> findByPostIdAndUserId(String postId, String userId);
}
