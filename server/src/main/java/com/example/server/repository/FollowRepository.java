package com.example.server.repository;

import com.example.server.entity.Follow;
import com.example.server.entity.FollowId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FollowRepository extends JpaRepository<Follow, FollowId> {
    List<Follow> findByFollowerId(String followerId);
    List<Follow> findByFolloweeId(String followeeId);
    boolean existsByFollowerIdAndFolloweeId(String followerId, String followeeId);

}
