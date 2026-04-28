package com.example.the_autumn.repository;

import com.example.the_autumn.entity.Follow;
import com.example.the_autumn.entity.FollowId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FollowRepository extends JpaRepository<Follow, FollowId> {
    List<Follow> findByFollowerId(String followerId);
    List<Follow> findByFolloweeId(String followeeId);
    boolean existsByFollowerIdAndFolloweeId(String followerId, String followeeId);

}
