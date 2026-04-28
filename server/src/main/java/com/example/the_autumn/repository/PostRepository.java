package com.example.the_autumn.repository;

import com.example.the_autumn.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, String> {
    Page<Post> findByAuthorId(String authorId,Pageable pageable);

    Page<Post> findByMajorId(String majorId, Pageable pageable);
    Page<Post> findByTopic(String topic, Pageable pageable);
    Page<Post> findByIdIn(List<String> ids, Pageable pageable);

    int countByAuthorId(String authorId);
    int countByAuthorIdAndCreatedAtAfter(String authorId, LocalDateTime createdAt);

    @Query("SELECT COALESCE(SUM(p.views), 0) FROM Post p WHERE p.authorId = :authorId")
    int sumViewsByAuthorId(@Param("authorId") String authorId);

    @Query("SELECT COALESCE(SUM(p.likesCount), 0) FROM Post p WHERE p.authorId = :authorId")
    int sumLikesByAuthorId(@Param("authorId") String authorId);
}
