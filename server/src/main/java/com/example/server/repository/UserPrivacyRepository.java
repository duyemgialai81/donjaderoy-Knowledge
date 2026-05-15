package com.example.server.repository;

import com.example.server.entity.UserPrivacy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserPrivacyRepository extends JpaRepository<UserPrivacy, String> {
}