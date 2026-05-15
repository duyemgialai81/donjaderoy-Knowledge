package com.example.server.repository;

import com.example.server.entity.UserBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserBadgeRepository extends JpaRepository<UserBadge, String> {
    List<UserBadge> findByUserId(String userId);
    boolean existsByUserIdAndBadgeId(String userId, String badgeId);
    int countByUserId(String userId);
}
