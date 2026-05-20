package com.example.server.repository;

import com.example.server.entity.Leaderboard;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeaderboardRepository extends JpaRepository<Leaderboard, Long> {
    List<Leaderboard> findAllByUserIdOrderByIdAsc(String userId);
    List<Leaderboard> findAllByOrderByPointsDesc();
    Page<Leaderboard> findAllByOrderByPointsDesc(Pageable pageable);
    Page<Leaderboard> findAllByOrderByPostsThisWeekDesc(Pageable pageable);
    Page<Leaderboard> findByUserIdInOrderByPointsDesc(List<String> userIds, Pageable pageable);

    @Query("""
            SELECT lb FROM Leaderboard lb
            JOIN User u ON u.id = lb.userId
            WHERE u.majorId = :majorId
            ORDER BY lb.points DESC
            """)
    Page<Leaderboard> findByMajorIdOrderByPointsDesc(@Param("majorId") String majorId, Pageable pageable);
}
