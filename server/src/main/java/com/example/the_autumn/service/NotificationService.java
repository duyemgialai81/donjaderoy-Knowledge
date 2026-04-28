package com.example.the_autumn.service;

import com.example.the_autumn.model.response.ResponseObject;

public interface NotificationService {
    ResponseObject getNotifications(String userId, int page, int size);
    ResponseObject getUnreadCount(String userId);
    ResponseObject markAsRead(String notificationId);
    ResponseObject markAllAsRead(String userId);
    ResponseObject deleteNotification(String notificationId, String userId);
    ResponseObject deleteAllNotifications(String userId);
}