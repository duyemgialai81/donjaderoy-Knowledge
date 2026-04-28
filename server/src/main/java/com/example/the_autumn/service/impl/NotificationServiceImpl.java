package com.example.the_autumn.service.impl;

import com.example.the_autumn.entity.Notification;
import com.example.the_autumn.model.response.ResponseObject;
import com.example.the_autumn.repository.NotificationRepository;
import com.example.the_autumn.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class NotificationServiceImpl implements NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Override
    public ResponseObject getNotifications(String userId, int page, int size) {
        Page<Notification> notifications = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));

        return ResponseObject.success(
                new com.example.the_autumn.model.response.PageableObject<>(notifications),
                "OK"
        );
    }

    @Override
    public ResponseObject getUnreadCount(String userId) {
        int count = notificationRepository.countByUserIdAndIsRead(userId, false);
        return ResponseObject.success(new UnreadCountDTO(count), "OK");
    }

    @Override
    @Transactional
    public ResponseObject markAsRead(String notificationId) {
        Optional<Notification> maybe = notificationRepository.findById(notificationId);
        if (maybe.isEmpty()) {
            return ResponseObject.error("Không tìm thấy thông báo");
        }

        Notification notif = maybe.get();
        notif.setIsRead(true);
        notificationRepository.save(notif);

        return ResponseObject.success(null, "Đã đánh dấu đã đọc");
    }

    @Override
    @Transactional
    public ResponseObject markAllAsRead(String userId) {
        List<Notification> unreadNotifications = notificationRepository
                .findByUserIdAndIsRead(userId, false);

        for (Notification notif : unreadNotifications) {
            notif.setIsRead(true);
            notificationRepository.save(notif);
        }

        return ResponseObject.success(null, "Đã đánh dấu tất cả đã đọc");
    }

    @Override
    @Transactional
    public ResponseObject deleteNotification(String notificationId, String userId) {
        Optional<Notification> maybe = notificationRepository.findById(notificationId);
        if (maybe.isEmpty()) {
            return ResponseObject.error("Không tìm thấy thông báo");
        }

        Notification notif = maybe.get();
        if (!notif.getUserId().equals(userId)) {
            return ResponseObject.error("Bạn không có quyền xóa thông báo này");
        }

        notificationRepository.delete(notif);
        return ResponseObject.success(null, "Đã xóa thông báo");
    }

    @Override
    @Transactional
    public ResponseObject deleteAllNotifications(String userId) {
        List<Notification> notifications = notificationRepository.findByUserId(userId);
        notificationRepository.deleteAll(notifications);
        return ResponseObject.success(null, "Đã xóa tất cả thông báo");
    }

    // DTO
    public static class UnreadCountDTO {
        private int count;

        public UnreadCountDTO(int count) {
            this.count = count;
        }

        public int getCount() { return count; }
        public void setCount(int count) { this.count = count; }
    }
}