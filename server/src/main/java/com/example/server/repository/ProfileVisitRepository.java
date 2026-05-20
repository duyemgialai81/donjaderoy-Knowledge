package com.example.server.repository;

import com.example.server.entity.ProfileVisit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProfileVisitRepository extends JpaRepository<ProfileVisit, String> {
    long countByProfileUserId(String profileUserId);
    List<ProfileVisit> findByProfileUserIdOrderByVisitedAtDesc(String profileUserId);
}
