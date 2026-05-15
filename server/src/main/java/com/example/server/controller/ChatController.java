//package com.example.server.controller;
//
//import com.example.server.entity.VideoCall;
//import com.example.server.model.dto.CallDTO;
//import com.example.server.model.dto.ChatDTO;
//import com.example.server.model.response.ResponseObject;
//import com.example.server.service.ChatService;
//import com.example.server.service.VideoCallService;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.messaging.handler.annotation.MessageMapping;
//import org.springframework.messaging.handler.annotation.Payload;
//import org.springframework.messaging.simp.SimpMessagingTemplate;
//import org.springframework.web.bind.annotation.*;
//
//import java.security.Principal;
//
//@RestController
//@RequestMapping("/api/chat")
//public class ChatController {
//
//    @Autowired
//    private ChatService chatService;
//
//    @Autowired
//    private VideoCallService videoCallService;
//
//    @Autowired
//    private SimpMessagingTemplate messagingTemplate;
//    @GetMapping("/mutual-followers")
//    public ResponseObject getMutualFollowers(Principal principal) {
//        if (principal == null) {
//            return ResponseObject.error("Unauthorized: User not authenticated.");
//        }
//        String authUserId = principal.getName();
//        return new ResponseObject<>(chatService.getMutualFollowers(authUserId), "Lấy danh sách bạn bè thành công");
//    }
//    @GetMapping("/search-users")
//    public ResponseObject searchUsersToChat(@RequestParam String keyword, Principal principal) {
//        if (principal == null) {
//            return ResponseObject.error("Unauthorized: User not authenticated.");
//        }
//        String authUserId = principal.getName();
//        return new ResponseObject<>(chatService.searchUsersToChat(authUserId, keyword), "Tìm kiếm thành công");
//    }
//
//    @GetMapping("/conversations")
//    public ResponseObject getConversations(Principal principal) {
//        if (principal == null) {
//            return ResponseObject.error("Unauthorized: User not authenticated.");
//        }
//
//        String authUserId = principal.getName();
//        return new ResponseObject<>(chatService.getConversations(authUserId), "Lấy danh sách đoạn chat thành công");
//    }
//
//    @GetMapping("/messages/{conversationId}")
//    public ResponseObject getMessages(@PathVariable String conversationId, Principal principal) {
//        if (principal == null) {
//            return ResponseObject.error("Unauthorized: User not authenticated.");
//        }
//        return new ResponseObject<>(chatService.getMessagesByConversation(conversationId), "Lấy lịch sử tin nhắn thành công");
//    }
//
//    @MessageMapping("/chat.sendMessage")
//    public void processMessage(@Payload ChatDTO.MessageRequest request, Principal principal) {
//        if (principal == null) return;
//        String senderId = principal.getName();
//        try {
//            ChatDTO.MessageResponse savedMessage = chatService.processMessage(senderId, request);
//            messagingTemplate.convertAndSendToUser(
//                    request.getReceiverId(), "/queue/messages", savedMessage
//            );
//            messagingTemplate.convertAndSendToUser(
//                    senderId, "/queue/messages", savedMessage
//            );
//        } catch (Exception e) {
//            System.out.println(" LỖI LƯU TIN NHẮN: " + e.getMessage());
//            e.printStackTrace();
//
//            messagingTemplate.convertAndSendToUser(senderId, "/queue/errors", e.getMessage());
//        }
//    }
//
//    @MessageMapping("/chat.typing")
//    public void processTypingStatus(@Payload ChatDTO.TypingEvent event, Principal principal) {
//        if (principal == null) return;
//        String senderId = principal.getName();
//        event.setSenderId(senderId);
//        messagingTemplate.convertAndSendToUser(
//                event.getReceiverId(), "/queue/typing", event
//        );
//    }
//
//    @MessageMapping("/chat.call")
//    public void handleCallSignal(@Payload CallDTO callEvent, Principal principal) {
//        if (principal == null) return;
//        String senderId = principal.getName();
//        callEvent.setSenderId(senderId);
//        String signalType = callEvent.getType();
//        try {
//            switch (signalType) {
//                case "start":
//                    videoCallService.startCallHistory(callEvent);
//                    break;
//                case "reject":
//                    videoCallService.updateCallStatus(callEvent.getCallId(), VideoCall.CallStatus.declined);
//                    break;
//                case "end":
//                    videoCallService.updateCallStatus(callEvent.getCallId(), VideoCall.CallStatus.completed);
//                    break;
//            }
//            messagingTemplate.convertAndSendToUser(
//                    callEvent.getReceiverId(), "/queue/call", callEvent
//            );
//
//            // Nếu là kết thúc hoặc từ chối, báo cho cả người gọi để đóng UI
//            if ("reject".equals(signalType) || "end".equals(signalType)) {
//                messagingTemplate.convertAndSendToUser(
//                        senderId, "/queue/call", callEvent
//                );
//            }
//
//        } catch (Exception e) {
//            System.err.println(" Lỗi trung chuyển cuộc gọi: " + e.getMessage());
//        }
//    }
//}

package com.example.server.controller;

import com.example.server.entity.ConversationParticipant;
import com.example.server.entity.Message;
import com.example.server.entity.User;
import com.example.server.entity.VideoCall;
import com.example.server.model.dto.CallDTO;
import com.example.server.model.dto.ChatDTO;
import com.example.server.model.response.ResponseObject;
import com.example.server.repository.ConversationParticipantRepository;
import com.example.server.repository.UserRepository;
import com.example.server.service.ChatService;
import com.example.server.service.VideoCallService;
import com.example.server.service.cache.MessageCacheService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private VideoCallService videoCallService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MessageCacheService cacheService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ConversationParticipantRepository participantRepository;

    @GetMapping("/mutual-followers")
    public ResponseObject getMutualFollowers(Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized: User not authenticated.");
        return new ResponseObject<>(chatService.getMutualFollowers(principal.getName()), "Lấy danh sách bạn bè thành công");
    }

    @GetMapping("/search-users")
    public ResponseObject searchUsersToChat(@RequestParam String keyword, Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized: User not authenticated.");
        return new ResponseObject<>(chatService.searchUsersToChat(principal.getName(), keyword), "Tìm kiếm thành công");
    }

    @GetMapping("/conversations")
    public ResponseObject getConversations(Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized: User not authenticated.");
        String userId = principal.getName();
        cacheService.setUserOnline(userId); // ✅ Update online status
        return new ResponseObject<>(chatService.getConversations(userId), "Lấy danh sách đoạn chat thành công");
    }

    @GetMapping("/messages/{conversationId}")
    public ResponseObject getMessages(@PathVariable String conversationId, Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized: User not authenticated.");
        return new ResponseObject<>(chatService.getMessagesByConversation(conversationId), "Lấy lịch sử tin nhắn thành công");
    }

    // ==================== MESSAGE REACTIONS ====================

    @MessageMapping("/chat.react")
    public void handleReaction(@Payload ChatDTO.ReactionRequest request, Principal principal) {
        if (principal == null) return;
        String userId = principal.getName();

        try {
            if (!MessageCacheService.isValidEmoji(request.getEmoji())) {
                messagingTemplate.convertAndSendToUser(userId, "/queue/errors",
                        "Emoji không hợp lệ. Chỉ hỗ trợ: ❤️ 😂 👍 😮  🎉 👎 🔥 ⭐ 💯");
                return;
            }

            boolean isAdded = chatService.toggleMessageReaction(request.getMessageId(), userId, request.getEmoji());
            Map<String, Long> reactions = chatService.getMessageReactions(request.getMessageId());

            String senderName = userRepository.findById(userId).map(User::getName).orElse("Người dùng");
            String senderAvatar = userRepository.findById(userId).map(User::getAvatar).orElse(null);

            ChatDTO.ReactionResponse response = ChatDTO.ReactionResponse.builder()
                    .messageId(request.getMessageId())
                    .userId(userId)
                    .userName(senderName)
                    .userAvatar(senderAvatar)
                    .emoji(request.getEmoji())
                    .action(isAdded ? "added" : "removed")
                    .reactions(reactions)
                    .timestamp(LocalDateTime.now())
                    .build();

            String conversationId = cacheService.getMessage(request.getMessageId())
                    .map(Message::getConversationId).orElse(null);

            if (conversationId != null) {
                // ✅ FIX LỖI 2: Dùng lambda thay method reference để tránh lỗi cache IDE
                Set<String> participants = participantRepository.findByConversationId(conversationId).stream()
                        .map(p -> p.getUserId())
                        .collect(Collectors.toSet());

                for (String pid : participants) {
                    messagingTemplate.convertAndSendToUser(pid, "/queue/reactions", response);
                }
            }
        } catch (IllegalArgumentException e) {
            log.warn("Invalid reaction request from user {}: {}", userId, e.getMessage());
            messagingTemplate.convertAndSendToUser(userId, "/queue/errors", e.getMessage());
        } catch (Exception e) {
            log.error("Error handling reaction from user {}", userId, e);
            messagingTemplate.convertAndSendToUser(userId, "/queue/errors", "Không thể thực hiện reaction");
        }
    }

    @GetMapping("/messages/{messageId}/reactions")
    public ResponseObject getMessageReactions(@PathVariable String messageId, Principal principal) {
        try {
            Map<String, Long> reactions = chatService.getMessageReactions(messageId);

            if (principal != null) {
                String userId = principal.getName();
                Map<String, Boolean> userReactions = chatService.getUserReactionsForMessage(messageId, userId);

                // ✅ FIX LỖI 3: Cast long -> int cho .count()
                ChatDTO.ReactionListResponse response = ChatDTO.ReactionListResponse.builder()
                        .messageId(messageId)
                        .reactionDetails(buildReactionDetails(reactions, userReactions))
                        .totalReactions(reactions.values().stream().mapToInt(Long::intValue).sum())
                        .uniqueUsers((int) reactions.values().stream().filter(c -> c > 0).count())
                        .build();

                return new ResponseObject<>(response, "Lấy reactions thành công");
            }
            return new ResponseObject<>(reactions, "Lấy reactions thành công");
        } catch (Exception e) {
            log.error("Error getting reactions for message {}", messageId, e);
            return ResponseObject.error("Lỗi khi lấy reactions: " + e.getMessage());
        }
    }

    @GetMapping("/messages/{messageId}/my-reactions")
    public ResponseObject getMyReactions(@PathVariable String messageId, Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized");
        try {
            Map<String, Boolean> myReactions = chatService.getUserReactionsForMessage(messageId, principal.getName());
            return new ResponseObject<>(myReactions, "Lấy reactions của bạn thành công");
        } catch (Exception e) {
            return ResponseObject.error("Lỗi: " + e.getMessage());
        }
    }

    @MessageMapping("/chat.sendMessage")
    public void processMessage(@Payload ChatDTO.MessageRequest request, Principal principal) {
        if (principal == null) return;
        String senderId = principal.getName();
        try {
            ChatDTO.MessageResponse savedMessage = chatService.processMessage(senderId, request);
            messagingTemplate.convertAndSendToUser(request.getReceiverId(), "/queue/messages", savedMessage);
            messagingTemplate.convertAndSendToUser(senderId, "/queue/messages", savedMessage);
        } catch (Exception e) {
            log.error("Error sending message from user {}", senderId, e);
            messagingTemplate.convertAndSendToUser(senderId, "/queue/errors", "Lỗi gửi tin nhắn: " + e.getMessage());
        }
    }

    @MessageMapping("/chat.typing")
    public void processTypingStatus(@Payload ChatDTO.TypingEvent event, Principal principal) {
        if (principal == null) return;
        event.setSenderId(principal.getName());
        messagingTemplate.convertAndSendToUser(event.getReceiverId(), "/queue/typing", event);
    }

    @MessageMapping("/chat.call")
    public void handleCallSignal(@Payload CallDTO callEvent, Principal principal) {
        if (principal == null) return;
        callEvent.setSenderId(principal.getName());
        try {
            switch (callEvent.getType()) {
                case "start" -> videoCallService.startCallHistory(callEvent);
                case "reject" -> videoCallService.updateCallStatus(callEvent.getCallId(), VideoCall.CallStatus.declined);
                case "end" -> videoCallService.updateCallStatus(callEvent.getCallId(), VideoCall.CallStatus.completed);
            }
            messagingTemplate.convertAndSendToUser(callEvent.getReceiverId(), "/queue/call", callEvent);
            if ("reject".equals(callEvent.getType()) || "end".equals(callEvent.getType())) {
                messagingTemplate.convertAndSendToUser(callEvent.getSenderId(), "/queue/call", callEvent);
            }
        } catch (Exception e) {
            log.error("Error handling call signal", e);
            messagingTemplate.convertAndSendToUser(callEvent.getSenderId(), "/queue/errors", "Lỗi cuộc gọi: " + e.getMessage());
        }
    }

    @GetMapping("/health/redis")
    public ResponseObject checkRedisHealth() {
        return cacheService.isRedisHealthy()
                ? new ResponseObject<>(true, "Redis connected")
                : ResponseObject.error("Redis connection failed");
    }

    private Map<String, ChatDTO.ReactionListResponse.ReactionDetail> buildReactionDetails(
            Map<String, Long> reactions, Map<String, Boolean> userReactions) {
        return reactions.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> ChatDTO.ReactionListResponse.ReactionDetail.builder()
                                .emoji(e.getKey())
                                .count(e.getValue())
                                .hasCurrentUserReacted(userReactions.getOrDefault(e.getKey(), false))
                                .build()
                ));
    }
}