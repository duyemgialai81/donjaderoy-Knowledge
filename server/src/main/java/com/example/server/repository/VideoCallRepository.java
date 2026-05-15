package com.example.server.repository;

import com.example.server.entity.VideoCall;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VideoCallRepository extends JpaRepository<VideoCall, String> {
}