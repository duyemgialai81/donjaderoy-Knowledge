package com.example.server.repository;

import com.example.server.entity.AdminAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdminActionRepository extends JpaRepository<AdminAction, String> {
    List<AdminAction> findTop50ByOrderByCreatedAtDesc();
}
