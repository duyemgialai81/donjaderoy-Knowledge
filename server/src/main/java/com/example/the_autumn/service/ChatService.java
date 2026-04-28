package com.example.the_autumn.service;

import com.example.the_autumn.entity.*;
import com.example.the_autumn.model.dto.ChatDTO;
import com.example.the_autumn.model.dto.UserDTO;
import com.example.the_autumn.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ChatService {

    @Autowired private ConversationRepository conversationRepository;
    @Autowired private ConversationParticipantRepository participantRepository;
    @Autowired private MessageRepository messageRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private UserPrivacyRepository userPrivacyRepository;
    @Autowired private BlockRepository blockRepository;
    @Autowired private FollowRepository followRepository;

    // 1. Lấy danh sách bạn bè để bắt đầu chat
    public List<UserDTO> getMutualFollowers(String userId) {
        return userRepository.findMutualFollowers(userId).stream()
                .map(this::mapToUserDTO).collect(Collectors.toList());
    }

    // 2. Tìm kiếm người dùng để nhắn tin
    public List<UserDTO> searchUsersToChat(String currentUserId, String keyword) {
        return userRepository.searchUsersForChat(keyword, currentUserId).stream()
                .map(this::mapToUserDTO).collect(Collectors.toList());
    }

    // 3. Xử lý gửi tin nhắn & Kiểm tra Quyền riêng tư
    @Transactional
    public ChatDTO.MessageResponse processMessage(String senderId, ChatDTO.MessageRequest request) {
        String receiverId = request.getReceiverId();

        // Kiểm tra block
        if (blockRepository.existsByBlockerIdAndBlockedId(senderId, receiverId) ||
                blockRepository.existsByBlockerIdAndBlockedId(receiverId, senderId)) {
            throw new RuntimeException("Không thể gửi tin nhắn. Người dùng đã bị chặn.");
        }

        String conversationId = request.getConversationId();

        // Nếu chưa có conversationId, tạo mới 1-1
        if (conversationId == null || conversationId.isEmpty()) {
            conversationId = getOrCreateDirectConversation(senderId, receiverId);
        }

        // XỬ LÝ AN TOÀN CHO ENUM MESSAGETYPE
        Message.MessageType type;
        if (request.getMessageType() != null && request.getMessageType().equalsIgnoreCase("image")) {
            type = Message.MessageType.image; // Thay đổi tùy theo tên Enum thực tế trong DB của bạn (vd: IMAGE)
        } else {
            type = Message.MessageType.text; // Mặc định là text
        }

        // Lưu tin nhắn
        Message msg = Message.builder()
                .id(UUID.randomUUID().toString())
                .conversationId(conversationId)
                .senderId(senderId)
                .content(request.getContent())
                .messageType(type) // Gán kiểu đã xử lý an toàn ở trên
                .isDeleted(false)
                .createdAt(LocalDateTime.now())
                .build();

        // ✅ BẠN ĐÃ QUÊN DÒNG NÀY TRONG CODE GẦN NHẤT
        messageRepository.save(msg);

        // Update thời gian conversation
        Conversation conv = conversationRepository.findById(conversationId).orElseThrow();
        conv.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conv);

        // Map sang Response
        ChatDTO.MessageResponse response = new ChatDTO.MessageResponse();
        response.setId(msg.getId());
        response.setConversationId(conversationId);
        response.setSenderId(senderId);
        response.setContent(msg.getContent());
        response.setMessageType(msg.getMessageType().name());
        response.setCreatedAt(msg.getCreatedAt());

        return response;
    }

    // ==========================================
    // CÁC HÀM MỚI BỔ SUNG CHO CONTROLLER
    // ==========================================

    // 4. Lấy lịch sử tất cả các đoạn chat của User
    public List<ChatDTO.ConversationItem> getConversations(String userId) {
        // Lấy tất cả các participant của user này
        List<ConversationParticipant> myParticipants = participantRepository.findByUserId(userId);

        return myParticipants.stream().map(myPart -> {
                    String convId = myPart.getConversationId();
                    Conversation conv = conversationRepository.findById(convId).orElse(null);

                    ChatDTO.ConversationItem item = new ChatDTO.ConversationItem();
                    item.setId(convId);
                    item.setStatus(myPart.getStatus() != null ? myPart.getStatus().name() : "accepted");

                    if (conv != null) {
                        item.setType(conv.getType() != null ? conv.getType().name() : "direct");

                        // Nếu là chat 1-1, tìm thông tin người đối diện
                        if (conv.getType() == Conversation.ConversationType.direct) {
                            List<ConversationParticipant> allParts = participantRepository.findByConversationId(convId);
                            ConversationParticipant otherPart = allParts.stream()
                                    .filter(p -> !p.getUserId().equals(userId))
                                    .findFirst().orElse(null);

                            if (otherPart != null) {
                                User otherUser = userRepository.findById(otherPart.getUserId()).orElse(null);
                                if (otherUser != null) {
                                    item.setTargetUserId(otherUser.getId());
                                    item.setTargetUserName(otherUser.getName());
                                    item.setTargetUserAvatar(otherUser.getAvatar());
                                }
                            }
                        }
                    }

                    // Lấy tin nhắn cuối cùng để hiển thị ra ngoài danh sách
                    List<Message> msgs = messageRepository.findByConversationIdOrderByCreatedAtAsc(convId);
                    if (!msgs.isEmpty()) {
                        Message lastMsg = msgs.get(msgs.size() - 1); // Tin nhắn mới nhất nằm cuối
                        item.setLastMessage(lastMsg.getContent());
                        item.setLastMessageTime(lastMsg.getCreatedAt());
                    } else {
                        item.setLastMessage("Bắt đầu cuộc trò chuyện...");
                    }

                    item.setUnreadCount(0); // TODO: Xử lý logic đếm tin chưa đọc sau (nếu cần)
                    return item;

                })
                // Sắp xếp các đoạn chat: Có tin nhắn mới nhất lên đầu
                .sorted((a, b) -> {
                    if (a.getLastMessageTime() == null) return 1;
                    if (b.getLastMessageTime() == null) return -1;
                    return b.getLastMessageTime().compareTo(a.getLastMessageTime());
                })
                .collect(Collectors.toList());
    }

    // 5. Lấy toàn bộ tin nhắn trong 1 đoạn chat cụ thể
    public List<ChatDTO.MessageResponse> getMessagesByConversation(String conversationId) {
        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);

        return messages.stream().map(msg -> {
            ChatDTO.MessageResponse resp = new ChatDTO.MessageResponse();
            resp.setId(msg.getId());
            resp.setConversationId(msg.getConversationId());
            resp.setSenderId(msg.getSenderId());
            resp.setContent(msg.getContent());
            resp.setMessageType(msg.getMessageType() != null ? msg.getMessageType().name() : "text");
            resp.setCreatedAt(msg.getCreatedAt());
            return resp;
        }).collect(Collectors.toList());
    }

    // ==========================================
    // CÁC HÀM PRIVATE HỖ TRỢ
    // ==========================================

    private String getOrCreateDirectConversation(String senderId, String receiverId) {
        Conversation conv = Conversation.builder()
                .id(UUID.randomUUID().toString())
                .type(Conversation.ConversationType.direct)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        conversationRepository.save(conv);
        UserPrivacy privacy = userPrivacyRepository.findById(receiverId).orElse(new UserPrivacy());
        boolean isMutual = followRepository.existsById(new FollowId(senderId, receiverId)) &&
                followRepository.existsById(new FollowId(receiverId, senderId));
        String receiverStatus = "accepted";
        if (privacy.getRequireApproval() != null && privacy.getRequireApproval() && !isMutual) {
            receiverStatus = "pending";
        }

        participantRepository.save(new ConversationParticipant(conv.getId(), senderId, ConversationParticipant.ParticipantRole.member, ConversationParticipant.ParticipantStatus.accepted, LocalDateTime.now(), LocalDateTime.now()));
        participantRepository.save(new ConversationParticipant(conv.getId(), receiverId, ConversationParticipant.ParticipantRole.member, ConversationParticipant.ParticipantStatus.valueOf(receiverStatus), null, LocalDateTime.now()));

        return conv.getId();
    }

    private UserDTO mapToUserDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setAvatar(user.getAvatar());
        return dto;
    }
}