package com.example.server.controller;

import com.example.server.model.response.ResponseObject;
import com.example.server.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping("/{userId}")
    public ResponseObject getNotifications(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return notificationService.getNotifications(userId, page, size);
    }

    @GetMapping("/{userId}/unread-count")
    public ResponseObject getUnreadCount(@PathVariable String userId) {
        return notificationService.getUnreadCount(userId);
    }

    @PutMapping("/{notificationId}/read")
    public ResponseObject markAsRead(@PathVariable String notificationId) {
        return notificationService.markAsRead(notificationId);
    }

    @PutMapping("/{userId}/read-all")
    public ResponseObject markAllAsRead(@PathVariable String userId) {
        return notificationService.markAllAsRead(userId);
    }

    @DeleteMapping("/{notificationId}")
    public ResponseObject deleteNotification(
            @PathVariable String notificationId,
            @RequestParam String userId) {
        return notificationService.deleteNotification(notificationId, userId);
    }

    @DeleteMapping("/{userId}/all")
    public ResponseObject deleteAllNotifications(@PathVariable String userId) {
        return notificationService.deleteAllNotifications(userId);
    }
}
