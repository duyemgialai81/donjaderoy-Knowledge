package com.example.the_autumn.repository;

import com.example.the_autumn.entity.SavedPost;
import com.example.the_autumn.entity.SavedPostId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavedPostRepository extends JpaRepository<SavedPost, SavedPostId> {
    List<SavedPost> findByUserId(String userId);

    boolean existsByUserIdAndPostId(String userId, String postId);
    int countByUserId(String userId);
}
