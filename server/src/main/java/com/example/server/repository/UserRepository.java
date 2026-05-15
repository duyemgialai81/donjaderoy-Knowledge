package com.example.server.repository;

import com.example.server.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    long countByPointsGreaterThan(Integer points);

    List<User> findByMajorId(String majorId);
    Page<User> findByIdIn(List<String> ids, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.name LIKE %:keyword% OR u.email LIKE %:keyword%")
    Page<User> searchByNameOrEmail(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT u FROM User u WHERE " +
            "(LOWER(u.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND u.id NOT IN (SELECT b.blockedId FROM Block b WHERE b.blockerId = :currentUserId) " +
            "AND u.id NOT IN (SELECT b.blockerId FROM Block b WHERE b.blockedId = :currentUserId)")
    List<User> searchUsersForChat(@Param("keyword") String keyword, @Param("currentUserId") String currentUserId);

    // Tìm follow chéo (Mutual Followers)
    @Query("SELECT u FROM User u WHERE u.id IN " +
            "(SELECT f1.followeeId FROM Follow f1 WHERE f1.followerId = :userId AND f1.followeeId IN " +
            "(SELECT f2.followerId FROM Follow f2 WHERE f2.followeeId = :userId))")
    List<User> findMutualFollowers(@Param("userId") String userId);
}
