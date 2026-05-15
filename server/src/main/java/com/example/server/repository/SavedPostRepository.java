package com.example.server.repository;

import com.example.server.entity.SavedPost;
import com.example.server.entity.SavedPostId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavedPostRepository extends JpaRepository<SavedPost, SavedPostId> {
    List<SavedPost> findByUserId(String userId);

    boolean existsByUserIdAndPostId(String userId, String postId);
    int countByUserId(String userId);
}
