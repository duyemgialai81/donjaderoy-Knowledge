package com.example.the_autumn.repository;

import com.example.the_autumn.entity.VideoCall;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VideoCallRepository extends JpaRepository<VideoCall, String> {
}