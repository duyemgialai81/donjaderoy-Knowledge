package com.example.server.controller;

import com.example.server.entity.VideoCall;
import com.example.server.model.dto.CallDTO;
import com.example.server.model.dto.ChatDTO;
import com.example.server.model.response.ResponseObject;
import com.example.server.service.ChatService;
import com.example.server.service.VideoCallService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private VideoCallService videoCallService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    @GetMapping("/mutual-followers")
    public ResponseObject getMutualFollowers(Principal principal) {
        if (principal == null) {
            return ResponseObject.error("Unauthorized: User not authenticated.");
        }
        String authUserId = principal.getName();
        return new ResponseObject<>(chatService.getMutualFollowers(authUserId), "Lấy danh sách bạn bè thành công");
    }
    @GetMapping("/search-users")
    public ResponseObject searchUsersToChat(@RequestParam String keyword, Principal principal) {
        if (principal == null) {
            return ResponseObject.error("Unauthorized: User not authenticated.");
        }
        String authUserId = principal.getName();
        return new ResponseObject<>(chatService.searchUsersToChat(authUserId, keyword), "Tìm kiếm thành công");
    }

    @GetMapping("/conversations")
    public ResponseObject getConversations(Principal principal) {
        if (principal == null) {
            return ResponseObject.error("Unauthorized: User not authenticated.");
        }

        String authUserId = principal.getName();
        return new ResponseObject<>(chatService.getConversations(authUserId), "Lấy danh sách đoạn chat thành công");
    }

    @GetMapping("/messages/{conversationId}")
    public ResponseObject getMessages(@PathVariable String conversationId, Principal principal) {
        if (principal == null) {
            return ResponseObject.error("Unauthorized: User not authenticated.");
        }
        return new ResponseObject<>(chatService.getMessagesByConversation(conversationId), "Lấy lịch sử tin nhắn thành công");
    }

    @MessageMapping("/chat.sendMessage")
    public void processMessage(@Payload ChatDTO.MessageRequest request, Principal principal) {
        if (principal == null) return;
        String senderId = principal.getName();
        try {
            ChatDTO.MessageResponse savedMessage = chatService.processMessage(senderId, request);
            messagingTemplate.convertAndSendToUser(
                    request.getReceiverId(), "/queue/messages", savedMessage
            );
            messagingTemplate.convertAndSendToUser(
                    senderId, "/queue/messages", savedMessage
            );
        } catch (Exception e) {
            System.out.println(" LỖI LƯU TIN NHẮN: " + e.getMessage());
            e.printStackTrace();

            messagingTemplate.convertAndSendToUser(senderId, "/queue/errors", e.getMessage());
        }
    }

    @MessageMapping("/chat.typing")
    public void processTypingStatus(@Payload ChatDTO.TypingEvent event, Principal principal) {
        if (principal == null) return;
        String senderId = principal.getName();
        event.setSenderId(senderId);
        messagingTemplate.convertAndSendToUser(
                event.getReceiverId(), "/queue/typing", event
        );
    }

    @MessageMapping("/chat.call")
    public void handleCallSignal(@Payload CallDTO callEvent, Principal principal) {
        if (principal == null) return;
        String senderId = principal.getName();
        callEvent.setSenderId(senderId);
        String signalType = callEvent.getType();
        try {
            switch (signalType) {
                case "start":
                    videoCallService.startCallHistory(callEvent);
                    break;
                case "reject":
                    videoCallService.updateCallStatus(callEvent.getCallId(), VideoCall.CallStatus.declined);
                    break;
                case "end":
                    videoCallService.updateCallStatus(callEvent.getCallId(), VideoCall.CallStatus.completed);
                    break;
            }
            messagingTemplate.convertAndSendToUser(
                    callEvent.getReceiverId(), "/queue/call", callEvent
            );

            // Nếu là kết thúc hoặc từ chối, báo cho cả người gọi để đóng UI
            if ("reject".equals(signalType) || "end".equals(signalType)) {
                messagingTemplate.convertAndSendToUser(
                        senderId, "/queue/call", callEvent
                );
            }

        } catch (Exception e) {
            System.err.println(" Lỗi trung chuyển cuộc gọi: " + e.getMessage());
        }
    }
}