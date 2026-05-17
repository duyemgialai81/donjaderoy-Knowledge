package com.example.server.repository;

import com.example.server.entity.Ban;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BanRepository extends JpaRepository<Ban, String> {
    @Query("SELECT COUNT(b) > 0 FROM Ban b WHERE b.userId = :userId AND b.isActive = true AND (b.endAt IS NULL OR b.endAt > :now)")
    boolean hasActiveBan(@Param("userId") String userId, @Param("now") LocalDateTime now);

    @Query("SELECT COUNT(b) FROM Ban b WHERE b.isActive = true AND (b.endAt IS NULL OR b.endAt > :now)")
    long countActiveBans(@Param("now") LocalDateTime now);

    List<Ban> findByUserIdAndIsActiveTrue(String userId);
}
