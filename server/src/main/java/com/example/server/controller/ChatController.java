package com.example.server.controller;

import com.example.server.entity.User;
import com.example.server.entity.VideoCall;
import com.example.server.model.dto.CallDTO;
import com.example.server.model.dto.ChatDTO;
import com.example.server.model.response.ResponseObject;
import com.example.server.repository.UserRepository;
import com.example.server.service.ChatService;
import com.example.server.service.VideoCallService;
import com.example.server.service.cache.MessageCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final VideoCallService videoCallService;
    private final SimpMessagingTemplate messagingTemplate;
    private final MessageCacheService cacheService;
    private final UserRepository userRepository;

    @GetMapping("/mutual-followers")
    public ResponseObject getMutualFollowers(Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized: User not authenticated.");
        return new ResponseObject<>(chatService.getMutualFollowers(principal.getName()), "Lay danh sach ban be thanh cong");
    }

    @GetMapping("/search-users")
    public ResponseObject searchUsersToChat(@RequestParam String keyword, Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized: User not authenticated.");
        return new ResponseObject<>(chatService.searchUsersToChat(principal.getName(), keyword), "Tim kiem thanh cong");
    }

    @GetMapping("/conversations")
    public ResponseObject getConversations(Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized: User not authenticated.");
        String userId = principal.getName();
        cacheService.setUserOnline(userId);
        return new ResponseObject<>(chatService.getConversations(userId), "Lay danh sach doan chat thanh cong");
    }

    @GetMapping("/conversations/page")
    public ResponseObject getConversationsPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            Principal principal
    ) {
        if (principal == null) return ResponseObject.error("Unauthorized: User not authenticated.");
        String userId = principal.getName();
        cacheService.setUserOnline(userId);
        return new ResponseObject<>(chatService.getConversationsPage(userId, page, size), "Lay trang doan chat thanh cong");
    }

    @PostMapping("/conversations")
    public ResponseObject createConversation(@RequestBody ChatDTO.ConversationCreateRequest request, Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized: User not authenticated.");
        try {
            ChatDTO.ConversationItem item = chatService.createConversation(request, principal.getName());
            broadcastToConversation(item.getId(), "/queue/conversation-updates", item);
            return new ResponseObject<>(item, "Da tao hoi thoai");
        } catch (Exception e) {
            return ResponseObject.error(e.getMessage());
        }
    }

    @GetMapping("/messages/{conversationId}")
    public ResponseObject getMessages(@PathVariable String conversationId, Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized: User not authenticated.");
        return new ResponseObject<>(chatService.getMessagesByConversation(conversationId), "Lay lich su tin nhan thanh cong");
    }

    @GetMapping("/messages/{conversationId}/page")
    public ResponseObject getMessagesPage(
            @PathVariable String conversationId,
            @RequestParam(required = false) String beforeMessageId,
            @RequestParam(defaultValue = "50") int limit,
            Principal principal
    ) {
        if (principal == null) return ResponseObject.error("Unauthorized: User not authenticated.");
        try {
            return new ResponseObject<>(
                    chatService.getMessagesByConversationPage(conversationId, beforeMessageId, limit, principal.getName()),
                    "Lay trang tin nhan thanh cong"
            );
        } catch (Exception e) {
            log.warn("Failed to get message page for conversation {}", conversationId, e);
            return ResponseObject.error(e.getMessage());
        }
    }

    @PostMapping("/conversations/{conversationId}/read")
    public ResponseObject markConversationAsRead(@PathVariable String conversationId, Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized: User not authenticated.");
        try {
            chatService.markConversationAsRead(conversationId, principal.getName());
            return new ResponseObject<>(true, "Da danh dau da doc");
        } catch (Exception e) {
            return ResponseObject.error(e.getMessage());
        }
    }

    @PostMapping("/messages")
    public ResponseObject sendMessage(@RequestBody ChatDTO.MessageRequest request, Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized: User not authenticated.");
        String senderId = principal.getName();
        try {
            ChatDTO.MessageResponse savedMessage = chatService.processMessage(senderId, request);
            broadcastToConversation(savedMessage.getConversationId(), "/queue/messages", savedMessage);
            return new ResponseObject<>(savedMessage, "Da gui tin nhan");
        } catch (Exception e) {
            log.error("Error sending REST message from user {}", senderId, e);
            return ResponseObject.error(e.getMessage());
        }
    }

    @RequestMapping(value = "/conversations/{conversationId}/accept", method = {RequestMethod.PUT, RequestMethod.POST})
    public ResponseObject acceptConversationRequest(@PathVariable String conversationId, Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized: User not authenticated.");
        try {
            ChatDTO.ConversationItem item = chatService.acceptConversationRequest(conversationId, principal.getName());
            broadcastToConversation(conversationId, "/queue/conversation-updates", item);
            return new ResponseObject<>(item, "Da chap nhan tin nhan");
        } catch (Exception e) {
            return ResponseObject.error(e.getMessage());
        }
    }

    @RequestMapping(value = "/conversations/{conversationId}/reject", method = {RequestMethod.PUT, RequestMethod.POST})
    public ResponseObject rejectConversationRequest(@PathVariable String conversationId, Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized: User not authenticated.");
        try {
            chatService.rejectConversationRequest(conversationId, principal.getName());
            return new ResponseObject<>(true, "Da tu choi tin nhan");
        } catch (Exception e) {
            return ResponseObject.error(e.getMessage());
        }
    }

    @PutMapping("/messages/{messageId}")
    public ResponseObject editMessage(
            @PathVariable String messageId,
            @RequestBody ChatDTO.MessageEditRequest request,
            Principal principal
    ) {
        if (principal == null) return ResponseObject.error("Unauthorized: User not authenticated.");
        try {
            ChatDTO.MessageResponse response = chatService.editMessage(messageId, principal.getName(), request.getContent());
            broadcastToConversation(response.getConversationId(), "/queue/message-updates", response);
            return new ResponseObject<>(response, "Da cap nhat tin nhan");
        } catch (Exception e) {
            return ResponseObject.error(e.getMessage());
        }
    }

    @DeleteMapping("/messages/{messageId}")
    public ResponseObject deleteMessage(@PathVariable String messageId, Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized: User not authenticated.");
        try {
            ChatDTO.MessageResponse response = chatService.deleteMessage(messageId, principal.getName());
            broadcastToConversation(response.getConversationId(), "/queue/message-updates", response);
            return new ResponseObject<>(response, "Da xoa tin nhan");
        } catch (Exception e) {
            return ResponseObject.error(e.getMessage());
        }
    }

    @MessageMapping("/chat.sendMessage")
    public void processMessage(@Payload ChatDTO.MessageRequest request, Principal principal) {
        if (principal == null) return;
        String senderId = principal.getName();
        try {
            ChatDTO.MessageResponse savedMessage = chatService.processMessage(senderId, request);
            broadcastToConversation(savedMessage.getConversationId(), "/queue/messages", savedMessage);
        } catch (Exception e) {
            log.error("Error sending message from user {}", senderId, e);
            messagingTemplate.convertAndSendToUser(senderId, "/queue/errors", "Loi gui tin nhan: " + e.getMessage());
        }
    }

    @MessageMapping("/presence.ping")
    public void pingPresence(Principal principal) {
        if (principal == null) return;
        String userId = principal.getName();
        chatService.setUserOnline(userId);
        Map<String, Object> payload = Map.of("userId", userId, "isOnline", true, "timestamp", LocalDateTime.now());
        chatService.getConversationPeerIds(userId)
                .forEach(peerId -> messagingTemplate.convertAndSendToUser(peerId, "/queue/online-status", payload));
    }

    @MessageMapping("/chat.typing")
    public void processTypingStatus(@Payload ChatDTO.TypingEvent event, Principal principal) {
        if (principal == null) return;
        String senderId = principal.getName();
        event.setSenderId(senderId);

        if (event.getConversationId() != null && !event.getConversationId().isBlank()) {
            chatService.getParticipantIds(event.getConversationId()).stream()
                    .filter(userId -> !userId.equals(senderId))
                    .forEach(userId -> messagingTemplate.convertAndSendToUser(userId, "/queue/typing", event));
            return;
        }

        if (event.getReceiverId() != null && !event.getReceiverId().isBlank()) {
            messagingTemplate.convertAndSendToUser(event.getReceiverId(), "/queue/typing", event);
        }
    }

    @MessageMapping("/chat.react")
    public void handleReaction(@Payload ChatDTO.ReactionRequest request, Principal principal) {
        if (principal == null) return;
        String userId = principal.getName();

        try {
            boolean isAdded = chatService.toggleMessageReaction(request.getMessageId(), userId, request.getEmoji());
            Map<String, Long> reactions = chatService.getMessageReactions(request.getMessageId());

            User user = userRepository.findById(userId).orElse(null);
            ChatDTO.ReactionResponse response = ChatDTO.ReactionResponse.builder()
                    .messageId(request.getMessageId())
                    .userId(userId)
                    .userName(user != null ? user.getName() : userId)
                    .userAvatar(user != null ? user.getAvatar() : null)
                    .emoji(request.getEmoji())
                    .action(isAdded ? "added" : "removed")
                    .reactions(reactions)
                    .timestamp(LocalDateTime.now())
                    .build();

            ChatDTO.MessageResponse message = chatService.getMessageWithReactions(request.getMessageId(), userId);
            if (message != null) {
                broadcastToConversation(message.getConversationId(), "/queue/reactions", response);
            }
        } catch (IllegalArgumentException e) {
            messagingTemplate.convertAndSendToUser(userId, "/queue/errors", e.getMessage());
        } catch (Exception e) {
            log.error("Error handling reaction from user {}", userId, e);
            messagingTemplate.convertAndSendToUser(userId, "/queue/errors", "Khong the thuc hien reaction");
        }
    }

    @GetMapping("/messages/{messageId}/reactions")
    public ResponseObject getMessageReactions(@PathVariable String messageId, Principal principal) {
        try {
            Map<String, Long> reactions = chatService.getMessageReactions(messageId);
            if (principal == null) {
                return new ResponseObject<>(reactions, "Lay reactions thanh cong");
            }

            Map<String, Boolean> userReactions = chatService.getUserReactionsForMessage(messageId, principal.getName());
            ChatDTO.ReactionListResponse response = ChatDTO.ReactionListResponse.builder()
                    .messageId(messageId)
                    .reactionDetails(buildReactionDetails(reactions, userReactions))
                    .totalReactions(reactions.values().stream().mapToInt(Long::intValue).sum())
                    .uniqueUsers((int) Math.min(chatService.countUniqueReactionUsers(messageId), Integer.MAX_VALUE))
                    .build();

            return new ResponseObject<>(response, "Lay reactions thanh cong");
        } catch (Exception e) {
            log.error("Error getting reactions for message {}", messageId, e);
            return ResponseObject.error("Loi khi lay reactions: " + e.getMessage());
        }
    }

    @GetMapping("/messages/{messageId}/my-reactions")
    public ResponseObject getMyReactions(@PathVariable String messageId, Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized");
        return new ResponseObject<>(
                chatService.getUserReactionsForMessage(messageId, principal.getName()),
                "Lay reactions cua ban thanh cong"
        );
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
                default -> {
                }
            }
            messagingTemplate.convertAndSendToUser(callEvent.getReceiverId(), "/queue/call", callEvent);
            if ("reject".equals(callEvent.getType()) || "end".equals(callEvent.getType())) {
                messagingTemplate.convertAndSendToUser(callEvent.getSenderId(), "/queue/call", callEvent);
            }
        } catch (Exception e) {
            log.error("Error handling call signal", e);
            messagingTemplate.convertAndSendToUser(callEvent.getSenderId(), "/queue/errors", "Loi cuoc goi: " + e.getMessage());
        }
    }

    @GetMapping("/health/redis")
    public ResponseObject checkRedisHealth() {
        return cacheService.isRedisHealthy()
                ? new ResponseObject<>(true, "Redis connected")
                : ResponseObject.error("Redis connection failed");
    }

    private void broadcastToConversation(String conversationId, String destination, Object payload) {
        Set<String> participants = chatService.getParticipantIds(conversationId);
        for (String participantId : participants) {
            messagingTemplate.convertAndSendToUser(participantId, destination, payload);
        }
    }

    private Map<String, ChatDTO.ReactionListResponse.ReactionDetail> buildReactionDetails(
            Map<String, Long> reactions,
            Map<String, Boolean> userReactions
    ) {
        return reactions.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> ChatDTO.ReactionListResponse.ReactionDetail.builder()
                                .emoji(entry.getKey())
                                .count(entry.getValue())
                                .hasCurrentUserReacted(userReactions.getOrDefault(entry.getKey(), false))
                                .build()
                ));
    }
}
