package com.example.server.repository;

import com.example.server.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<Session, String> {
    List<Session> findByUserId(String userId);
    List<Session> findByIsActiveTrue();
    Optional<Session> findByToken(String token);
}
