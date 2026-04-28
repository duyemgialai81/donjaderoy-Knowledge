package com.example.the_autumn.repository;

import com.example.the_autumn.entity.Leaderboard;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LeaderboardRepository extends JpaRepository<Leaderboard, Long> {
    Optional<Leaderboard> findByUserId(String userId);
    List<Leaderboard> findAllByOrderByPointsDesc();
    Page<Leaderboard> findAllByOrderByPointsDesc(Pageable pageable);
    Page<Leaderboard> findAllByOrderByPostsThisWeekDesc(Pageable pageable);
    Page<Leaderboard> findByUserIdInOrderByPointsDesc(List<String> userIds, Pageable pageable);
}
