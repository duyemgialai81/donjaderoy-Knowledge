package com.example.server.repository;

import com.example.server.entity.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, String> {
    Optional<EmailVerificationToken> findTopByEmailAndUsedFalseOrderByCreatedAtDesc(String email);
    List<EmailVerificationToken> findByEmailAndUsedFalse(String email);
}
