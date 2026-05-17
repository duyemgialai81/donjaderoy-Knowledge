package com.example.server.repository;

import com.example.server.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;


import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {
    Page<Notification> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    List<Notification> findByUserId(String userId);
    List<Notification> findByUserIdAndIsRead(String userId, Boolean isRead);
    int countByUserIdAndIsRead(String userId, Boolean isRead);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.userId = :userId AND n.isRead = false")
    int markAllReadByUserId(@Param("userId") String userId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.userId = :userId")
    int deleteAllByUserId(@Param("userId") String userId);

}
