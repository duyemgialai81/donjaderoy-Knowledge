package com.example.server.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * DTOs cho module Chat/Messaging
 * Bao gồm: Message, Typing, Conversation, Reaction
 */
public class ChatDTO {

    // ==================== MESSAGE ====================

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageRequest {
        private String conversationId;  // ID đoạn chat (có thể null nếu tạo mới)
        private String receiverId;      // ID người nhận (bắt buộc nếu conversationId null)
        private String content;         // Nội dung tin nhắn
        private String messageType;     // "text", "image", "video", "call_log"
        private String replyToMessageId;
        private String attachmentUrl;
        private String attachmentName;
        private Long attachmentSize;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageEditRequest {
        private String content;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MessageResponse {
        private String id;
        private String conversationId;
        private String senderId;
        private String content;
        private String messageType;     // "text", "image", "video", "call_log"
        private LocalDateTime createdAt;
        private LocalDateTime editedAt;
        private LocalDateTime deletedAt;
        private Boolean isDeleted;      // Default: false
        private String replyToMessageId;

        // === REACTION FIELDS (Discord-style) ===
        /**
         * Map emoji -> count
         * Ví dụ: { "❤️": 5, "😂": 2, "👍": 1 }
         */
        private Map<String, Long> reactions;

        /**
         * Map emoji -> hasCurrentUserReacted
         * Ví dụ: { "❤️": true, "😂": false }
         * Dùng để highlight reaction của user hiện tại
         */
        private Map<String, Boolean> userReactions;

        // === OPTIONAL: Attachment info ===
        private String attachmentUrl;   // URL ảnh/file đính kèm (nếu có)
        private String attachmentName;  // Tên file gốc
        private Long attachmentSize;    // Size file (bytes)
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MessagePageResponse {
        private List<MessageResponse> messages;
        private String nextBeforeMessageId;
        private LocalDateTime nextBeforeCreatedAt;
        private Boolean hasMore;
        private Integer limit;
    }

    // ==================== TYPING INDICATOR ====================

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TypingEvent {
        private String conversationId;
        private String senderId;        // Người đang typing
        private String receiverId;      // Người nhận event
        private boolean isTyping;       // true = đang gõ, false = dừng gõ

        // Alias cho frontend linh hoạt
        public boolean getTyping() { return isTyping; }
        public void setTyping(boolean typing) { this.isTyping = typing; }
    }

    // ==================== CONVERSATION LIST ====================

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConversationItem {
        private String id;                      // Conversation ID
        private String type;                    // "direct" hoặc "group"

        // Thông tin người/chat đối diện (cho direct chat)
        private String targetUserId;            // ID user đối diện
        private String targetUserName;          // Tên user đối diện
        private String targetUserAvatar;        // Avatar URL
        private Boolean targetIsOnline;         // Online status (optional)

        // Thông tin nhóm (cho group chat)
        private String groupName;               // Tên nhóm
        private Integer memberCount;            // Số thành viên (optional)

        // Tin nhắn cuối cùng để hiển thị preview
        private String lastMessage;             // Nội dung rút gọn
        private LocalDateTime lastMessageTime;  // Thời gian tin cuối
        private String lastMessageSenderName;   // Tên người gửi tin cuối (optional)
        private String lastMessageType;         // "text", "image", "call", etc.

        // Trạng thái & unread
        private String status;                  // "accepted", "pending", "blocked"
        private int unreadCount;                // Số tin chưa đọc

        // Metadata (optional)
        private LocalDateTime updatedAt;        // Last activity time
        private Boolean isMuted;                // User có mute conversation này không
        private Boolean isPinned;               // User có pin conversation này không
    }

    // ==================== REACTION (Discord-style) ====================

    /**
     * Request: User thêm/xóa reaction vào message
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReactionRequest {
        private String messageId;   // ID message cần react
        private String emoji;       // Emoji: ❤️, 😂, 👍, 😮, 😢, 🎉, 👎, 🔥, ⭐, 💯

        // Optional: Action explicit (nếu muốn rõ ràng thay vì toggle)
        // "add" = thêm, "remove" = xóa, null = toggle (default)
        private String action;
    }

    /**
     * Response: Broadcast reaction update tới các participants
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReactionResponse {
        private String messageId;           // ID message bị react
        private String userId;              // ID user thực hiện reaction
        private String userName;            // Tên user (optional, để hiển thị)
        private String userAvatar;          // Avatar user (optional)
        private String emoji;               // Emoji được react
        private String action;              // "added" hoặc "removed"

        /**
         * Toàn bộ reaction counts sau khi update
         * Ví dụ: { "❤️": 5, "😂": 3, "👍": 1 }
         */
        private Map<String, Long> reactions;

        private LocalDateTime timestamp;    // Thời gian event xảy ra
    }

    /**
     * Response: List reactions của một message (cho API GET)
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReactionListResponse {
        private String messageId;

        /**
         * Chi tiết từng emoji: count + list users (optional)
         */
        private Map<String, ReactionDetail> reactionDetails;

        private Integer totalReactions;     // Tổng số reaction (sum of counts)
        private Integer uniqueUsers;        // Số user khác nhau đã react

        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        @Builder
        public static class ReactionDetail {
            private String emoji;           // Emoji
            private Long count;             // Số lần react
            private Boolean hasCurrentUserReacted;  // User hiện tại có react emoji này không
            // Optional: List userIds đã react emoji này (nếu cần hiển thị tooltip)
            // private List<String> userIds;
        }
    }

    // ==================== CALL SIGNALING (WebRTC) ====================

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CallSignal {
        private String callId;                  // Unique ID cho cuộc gọi
        private String conversationId;          // ID conversation
        private String senderId;                // Người gửi signal
        private String receiverId;              // Người nhận signal
        private String type;                    // "start", "offer", "answer", "ice-candidate", "accept", "reject", "end"
        private String callType;                // "audio" hoặc "video"
        private Object signalData;              // SDP hoặc ICE candidate (JSON object)
        private LocalDateTime timestamp;        // Thời gian gửi signal
    }

    // ==================== SEARCH & USER INFO ====================

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserSearchResult {
        private String id;
        private String name;
        private String avatar;
        private String role;                // "student", "lecturer", "admin"
        private String majorName;           // Tên chuyên ngành (optional)
        private String className;           // Tên lớp (optional)
        private Boolean isOnline;           // Online status
        private Boolean isMutualFriend;     // Có follow nhau 2 chiều không
        private String lastSeen;            // "online", "5m ago", "2h ago", etc.
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConversationCreateRequest {
        private String receiverId;          // Cho direct chat
        private String groupName;           // Cho group chat
        private java.util.List<String> memberIds;  // Danh sách member (cho group)
        private String type;                // "direct" hoặc "group"
    }
}
