package com.example.server.service.impl;

import com.example.server.entity.Notification;
import com.example.server.model.response.ResponseObject;
import com.example.server.repository.NotificationRepository;
import com.example.server.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class NotificationServiceImpl implements NotificationService {
    private static final int MAX_PAGE_SIZE = 100;

    @Autowired
    private NotificationRepository notificationRepository;

    @Override
    public ResponseObject getNotifications(String userId, int page, int size) {
        Page<Notification> notifications = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(
                        userId,
                        PageRequest.of(normalizePage(page), normalizeSize(size))
                );

        return ResponseObject.success(
                new com.example.server.model.response.PageableObject<>(notifications),
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
        notificationRepository.markAllReadByUserId(userId);
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
        notificationRepository.deleteAllByUserId(userId);
        return ResponseObject.success(null, "Đã xóa tất cả thông báo");
    }

    private int normalizePage(int page) {
        return Math.max(0, page);
    }

    private int normalizeSize(int size) {
        if (size <= 0) {
            return 20;
        }
        return Math.min(size, MAX_PAGE_SIZE);
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
