package com.example.the_autumn.repository;

import com.example.the_autumn.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {
    Page<Notification> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    List<Notification> findByUserId(String userId);
    List<Notification> findByUserIdAndIsRead(String userId, Boolean isRead);
    int countByUserIdAndIsRead(String userId, Boolean isRead);

}
