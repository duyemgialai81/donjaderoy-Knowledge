package com.example.the_autumn.repository;

import com.example.the_autumn.entity.UserPrivacy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserPrivacyRepository extends JpaRepository<UserPrivacy, String> {
}