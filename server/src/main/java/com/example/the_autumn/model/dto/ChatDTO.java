package com.example.the_autumn.model.dto;

import lombok.Data;
import java.time.LocalDateTime;

public class ChatDTO {

    @Data
    public static class MessageRequest {
        private String conversationId;
        private String receiverId;
        private String content;
        private String messageType;
    }

    @Data
    public static class MessageResponse {
        private String id;
        private String conversationId;
        private String senderId;
        private String content;
        private String messageType;
        private LocalDateTime createdAt;
    }

    @Data
    public static class TypingEvent {
        private String conversationId;
        private String senderId;
        private String receiverId;
        private boolean isTyping;
    }

    @Data
    public static class ConversationItem {
        private String id;
        private String type;
        private String targetUserId;
        private String targetUserName;
        private String targetUserAvatar;
        private String lastMessage;
        private LocalDateTime lastMessageTime;
        private String status;
        private int unreadCount;
    }
}