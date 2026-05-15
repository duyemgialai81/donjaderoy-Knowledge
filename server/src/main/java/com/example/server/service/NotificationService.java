package com.example.server.service;

import com.example.server.model.response.ResponseObject;

public interface NotificationService {
    ResponseObject getNotifications(String userId, int page, int size);
    ResponseObject getUnreadCount(String userId);
    ResponseObject markAsRead(String notificationId);
    ResponseObject markAllAsRead(String userId);
    ResponseObject deleteNotification(String notificationId, String userId);
    ResponseObject deleteAllNotifications(String userId);
}