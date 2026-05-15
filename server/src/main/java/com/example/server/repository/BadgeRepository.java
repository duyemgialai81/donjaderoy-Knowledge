package com.example.server.repository;

import com.example.server.entity.Badge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BadgeRepository extends JpaRepository<Badge, String> {
    List<Badge> findAllByOrderByRequiredPointsAsc();
    List<Badge> findAllByOrderByRequiredPointsDesc();

    // Method 2: Using @Query annotation (more explicit)
    @Query("SELECT b FROM Badge b ORDER BY b.requiredPoints DESC")
    List<Badge> findBadgesOrderedByPointsDesc();

    @Query("SELECT b FROM Badge b ORDER BY b.requiredPoints ASC")
    List<Badge> findBadgesOrderedByPointsAsc();

    // Method 3: Shorter method names (also valid)
    List<Badge> findByOrderByRequiredPointsDesc();
    List<Badge> findByOrderByRequiredPointsAsc();
}