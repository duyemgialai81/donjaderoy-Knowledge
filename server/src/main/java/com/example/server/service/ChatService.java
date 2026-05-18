package com.example.server.service;

import com.example.server.entity.Conversation;
import com.example.server.entity.ConversationParticipant;
import com.example.server.entity.ConversationParticipantId;
import com.example.server.entity.FollowId;
import com.example.server.entity.Message;
import com.example.server.entity.User;
import com.example.server.entity.UserPrivacy;
import com.example.server.model.dto.ChatDTO;
import com.example.server.model.dto.UserDTO;
import com.example.server.model.response.PageableObject;
import com.example.server.repository.BlockRepository;
import com.example.server.repository.ConversationParticipantRepository;
import com.example.server.repository.ConversationRepository;
import com.example.server.repository.FollowRepository;
import com.example.server.repository.MessageReactionRepository;
import com.example.server.repository.MessageRepository;
import com.example.server.repository.UserPrivacyRepository;
import com.example.server.repository.UserRepository;
import com.example.server.service.cache.MessageCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private static final int DEFAULT_MESSAGE_LIMIT = 50;
    private static final int MAX_MESSAGE_LIMIT = 100;

    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final MessageRepository messageRepository;
    private final MessageReactionRepository messageReactionRepository;
    private final UserRepository userRepository;
    private final UserPrivacyRepository userPrivacyRepository;
    private final BlockRepository blockRepository;
    private final FollowRepository followRepository;
    private final MessageCacheService cacheService;

    public List<UserDTO> getMutualFollowers(String userId) {
        return userRepository.findMutualFollowers(userId).stream()
                .map(this::mapToUserDTO)
                .collect(Collectors.toList());
    }

    public List<UserDTO> searchUsersToChat(String currentUserId, String keyword) {
        return userRepository.searchUsersForChat(keyword, currentUserId, PageRequest.of(0, 20)).stream()
                .map(this::mapToUserDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ChatDTO.MessageResponse processMessage(String senderId, ChatDTO.MessageRequest request) {
        String conversationId = request.getConversationId();
        String receiverId = request.getReceiverId();

        if (!hasText(conversationId)) {
            if (!hasText(receiverId)) {
                throw new IllegalArgumentException("receiverId is required when conversationId is empty");
            }
            assertNotBlocked(senderId, receiverId);
            conversationId = getOrCreateDirectConversation(senderId, receiverId);
        } else {
            assertParticipant(conversationId, senderId);
            if (hasText(receiverId)) {
                assertNotBlocked(senderId, receiverId);
            }
        }

        LocalDateTime now = LocalDateTime.now();
        Message message = Message.builder()
                .id(UUID.randomUUID().toString())
                .conversationId(conversationId)
                .senderId(senderId)
                .content(request.getContent())
                .messageType(parseMessageType(request.getMessageType()))
                .replyToMessageId(request.getReplyToMessageId())
                .attachmentUrl(request.getAttachmentUrl())
                .attachmentName(request.getAttachmentName())
                .attachmentSize(request.getAttachmentSize())
                .isDeleted(false)
                .createdAt(now)
                .build();

        Message savedMessage = cacheService.saveMessageWithCache(message);
        touchConversation(conversationId, now);
        markConversationAsRead(conversationId, senderId, now);
        return mapToMessageResponse(savedMessage, senderId);
    }

    public List<ChatDTO.ConversationItem> getConversations(String userId) {
        return getConversationsPage(userId, 0, 50).getContent();
    }

    public PageableObject<ChatDTO.ConversationItem> getConversationsPage(String userId, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Page<ConversationParticipant> myParticipants = participantRepository.findConversationPageByUserId(
                userId,
                PageRequest.of(safePage, safeSize)
        );

        List<ChatDTO.ConversationItem> items = myParticipants.getContent().stream()
                .map(myPart -> buildConversationItem(userId, myPart))
                .filter(item -> item.getStatus() == null || !"blocked".equalsIgnoreCase(item.getStatus()))
                .sorted((a, b) -> {
                    if (a.getLastMessageTime() == null) return 1;
                    if (b.getLastMessageTime() == null) return -1;
                    return b.getLastMessageTime().compareTo(a.getLastMessageTime());
                })
                .collect(Collectors.toList());

        return new PageableObject<>(
                items,
                myParticipants.getNumber(),
                myParticipants.getSize(),
                myParticipants.getTotalElements(),
                myParticipants.getTotalPages()
        );
    }

    public List<ChatDTO.MessageResponse> getMessagesByConversation(String conversationId) {
        return cacheService.getMessagesByConversation(conversationId, DEFAULT_MESSAGE_LIMIT).stream()
                .map(message -> mapToMessageResponse(message, null))
                .collect(Collectors.toList());
    }

    public ChatDTO.MessagePageResponse getMessagesByConversationPage(
            String conversationId,
            String beforeMessageId,
            int limit,
            String currentUserId
    ) {
        assertParticipant(conversationId, currentUserId);

        int pageSize = normalizeLimit(limit);
        int fetchSize = pageSize + 1;
        List<Message> messages;

        if (hasText(beforeMessageId)) {
            Message cursor = cacheService.getMessage(beforeMessageId)
                    .orElseThrow(() -> new IllegalArgumentException("beforeMessageId does not exist"));
            messages = cacheService.getMessagesBefore(
                    conversationId,
                    cursor.getCreatedAt(),
                    cursor.getId(),
                    fetchSize
            );
        } else {
            messages = cacheService.getMessagesByConversation(conversationId, fetchSize);
        }

        boolean hasMore = messages.size() > pageSize;
        List<Message> pageMessages = new ArrayList<>(messages);
        if (hasMore) {
            pageMessages.remove(0);
        }

        List<ChatDTO.MessageResponse> responseMessages = pageMessages.stream()
                .map(message -> mapToMessageResponse(message, currentUserId))
                .collect(Collectors.toList());

        Message nextCursor = pageMessages.isEmpty() ? null : pageMessages.get(0);
        return ChatDTO.MessagePageResponse.builder()
                .messages(responseMessages)
                .nextBeforeMessageId(hasMore && nextCursor != null ? nextCursor.getId() : null)
                .nextBeforeCreatedAt(hasMore && nextCursor != null ? nextCursor.getCreatedAt() : null)
                .hasMore(hasMore)
                .limit(pageSize)
                .build();
    }

    public ChatDTO.MessageResponse getMessageWithReactions(String messageId, String currentUserId) {
        return cacheService.getMessage(messageId)
                .map(message -> mapToMessageResponse(message, currentUserId))
                .orElse(null);
    }

    @Transactional
    public ChatDTO.MessageResponse editMessage(String messageId, String userId, String content) {
        if (!hasText(content)) {
            throw new IllegalArgumentException("Message content is required");
        }
        Message message = cacheService.getMessage(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message does not exist"));
        assertMessageOwner(message, userId);
        if (Boolean.TRUE.equals(message.getIsDeleted())) {
            throw new IllegalStateException("Cannot edit a deleted message");
        }

        message.setContent(content);
        message.setEditedAt(LocalDateTime.now());
        Message saved = messageRepository.save(message);
        cacheService.cacheUpdatedMessage(saved);
        touchConversation(saved.getConversationId(), saved.getEditedAt());
        return mapToMessageResponse(saved, userId);
    }

    @Transactional
    public ChatDTO.MessageResponse deleteMessage(String messageId, String userId) {
        Message message = cacheService.getMessage(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message does not exist"));
        assertMessageOwner(message, userId);

        LocalDateTime now = LocalDateTime.now();
        message.setIsDeleted(true);
        message.setDeletedAt(now);
        message.setContent(null);
        Message saved = messageRepository.save(message);
        cacheService.cacheUpdatedMessage(saved);
        touchConversation(saved.getConversationId(), now);
        return mapToMessageResponse(saved, userId);
    }

    @Transactional
    public boolean toggleMessageReaction(String messageId, String userId, String emoji) {
        if (!MessageCacheService.isValidEmoji(emoji)) {
            throw new IllegalArgumentException("Emoji khong hop le: " + emoji);
        }
        Message message = cacheService.getMessage(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message does not exist"));
        assertParticipant(message.getConversationId(), userId);
        return cacheService.toggleReaction(messageId, userId, emoji);
    }

    public java.util.Map<String, Long> getMessageReactions(String messageId) {
        return cacheService.getReactionCounts(messageId);
    }

    public boolean hasUserReacted(String messageId, String userId, String emoji) {
        return cacheService.hasUserReacted(messageId, userId, emoji);
    }

    public java.util.Map<String, Boolean> getUserReactionsForMessage(String messageId, String userId) {
        return cacheService.getUserReactions(messageId, userId);
    }

    public long countUniqueReactionUsers(String messageId) {
        return messageReactionRepository.countDistinctUsersByMessageId(messageId);
    }

    @Transactional
    public void markConversationAsRead(String conversationId, String userId) {
        markConversationAsRead(conversationId, userId, LocalDateTime.now());
    }

    @Transactional
    public ChatDTO.ConversationItem acceptConversationRequest(String conversationId, String userId) {
        if (!hasText(conversationId)) {
            throw new IllegalArgumentException("conversationId is required");
        }

        ConversationParticipantId id = new ConversationParticipantId(conversationId, userId);
        ConversationParticipant participant = participantRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User is not a participant of this conversation"));

        if (participant.getStatus() == ConversationParticipant.ParticipantStatus.blocked) {
            throw new IllegalStateException("Conversation request was rejected");
        }

        participant.setStatus(ConversationParticipant.ParticipantStatus.accepted);
        participant.setLastReadAt(LocalDateTime.now());
        participantRepository.save(participant);
        touchConversation(conversationId, LocalDateTime.now());
        return buildConversationItem(userId, participant);
    }

    @Transactional
    public void rejectConversationRequest(String conversationId, String userId) {
        if (!hasText(conversationId)) {
            throw new IllegalArgumentException("conversationId is required");
        }

        ConversationParticipantId id = new ConversationParticipantId(conversationId, userId);
        ConversationParticipant participant = participantRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User is not a participant of this conversation"));

        participant.setStatus(ConversationParticipant.ParticipantStatus.blocked);
        participantRepository.save(participant);
        touchConversation(conversationId, LocalDateTime.now());
    }

    public Set<String> getParticipantIds(String conversationId) {
        return participantRepository.findByConversationId(conversationId).stream()
                .map(ConversationParticipant::getUserId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    public void setUserOnline(String userId) {
        cacheService.setUserOnline(userId);
    }

    public boolean isUserOnline(String userId) {
        return cacheService.isUserOnline(userId);
    }

    private ChatDTO.ConversationItem buildConversationItem(String userId, ConversationParticipant myPart) {
        String conversationId = myPart.getConversationId();
        Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
        List<ConversationParticipant> participants = participantRepository.findByConversationId(conversationId);

        ChatDTO.ConversationItem item = ChatDTO.ConversationItem.builder()
                .id(conversationId)
                .status(myPart.getStatus() != null ? myPart.getStatus().name() : "accepted")
                .build();

        if (conversation != null) {
            item.setType(conversation.getType() != null ? conversation.getType().name() : "direct");
            item.setUpdatedAt(conversation.getUpdatedAt());
            if (conversation.getType() == Conversation.ConversationType.direct) {
                fillDirectConversationTarget(item, userId, participants);
            } else {
                item.setGroupName(conversation.getName());
                item.setMemberCount(participants.size());
            }
        }

        List<Message> latestMessages = cacheService.getMessagesByConversation(conversationId, 1);
        if (latestMessages.isEmpty()) {
            item.setLastMessage("Bat dau cuoc tro chuyen...");
        } else {
            Message lastMessage = latestMessages.get(0);
            item.setLastMessage(lastMessage.getContent());
            item.setLastMessageTime(lastMessage.getCreatedAt());
            item.setLastMessageType(lastMessage.getMessageType() != null ? lastMessage.getMessageType().name() : "text");
            item.setLastMessageSenderName(lastMessage.getSenderId());
        }

        long unread = messageRepository.countUnreadMessages(conversationId, userId, myPart.getLastReadAt());
        item.setUnreadCount((int) Math.min(unread, Integer.MAX_VALUE));
        return item;
    }

    private void fillDirectConversationTarget(
            ChatDTO.ConversationItem item,
            String userId,
            List<ConversationParticipant> participants
    ) {
        participants.stream()
                .filter(participant -> !participant.getUserId().equals(userId))
                .findFirst()
                .flatMap(participant -> userRepository.findById(participant.getUserId()))
                .ifPresent(otherUser -> {
                    item.setTargetUserId(otherUser.getId());
                    item.setTargetUserName(otherUser.getName());
                    item.setTargetUserAvatar(otherUser.getAvatar());
                    item.setTargetIsOnline(cacheService.isUserOnline(otherUser.getId()));
                });
    }

    private void touchConversation(String conversationId, LocalDateTime time) {
        Conversation conversation = conversationRepository.findById(conversationId).orElseThrow();
        conversation.setUpdatedAt(time);
        conversationRepository.save(conversation);
    }

    private void markConversationAsRead(String conversationId, String userId, LocalDateTime readAt) {
        ConversationParticipantId id = new ConversationParticipantId(conversationId, userId);
        ConversationParticipant participant = participantRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User is not a participant of this conversation"));
        participant.setLastReadAt(readAt);
        participantRepository.save(participant);
    }

    private void assertParticipant(String conversationId, String userId) {
        if (!participantRepository.existsById(new ConversationParticipantId(conversationId, userId))) {
            throw new IllegalArgumentException("User is not a participant of this conversation");
        }
    }

    private void assertMessageOwner(Message message, String userId) {
        assertParticipant(message.getConversationId(), userId);
        if (!userId.equals(message.getSenderId())) {
            throw new IllegalStateException("Only sender can change this message");
        }
    }

    private void assertNotBlocked(String senderId, String receiverId) {
        if (blockRepository.existsByBlockerIdAndBlockedId(senderId, receiverId)
                || blockRepository.existsByBlockerIdAndBlockedId(receiverId, senderId)) {
            throw new IllegalStateException("Khong the gui tin nhan. Nguoi dung da bi chan.");
        }
    }

    private String getOrCreateDirectConversation(String senderId, String receiverId) {
        Conversation conversation = Conversation.builder()
                .id(UUID.randomUUID().toString())
                .type(Conversation.ConversationType.direct)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        conversationRepository.save(conversation);

        UserPrivacy privacy = userPrivacyRepository.findById(receiverId)
                .orElseGet(() -> {
                    UserPrivacy userPrivacy = new UserPrivacy();
                    userPrivacy.setUserId(receiverId);
                    userPrivacy.setRequireApproval(true);
                    return userPrivacy;
                });

        boolean isMutual = followRepository.existsById(new FollowId(senderId, receiverId))
                && followRepository.existsById(new FollowId(receiverId, senderId));
        ConversationParticipant.ParticipantStatus receiverStatus =
                Boolean.TRUE.equals(privacy.getRequireApproval()) && !isMutual
                        ? ConversationParticipant.ParticipantStatus.pending
                        : ConversationParticipant.ParticipantStatus.accepted;

        participantRepository.save(ConversationParticipant.builder()
                .conversationId(conversation.getId())
                .userId(senderId)
                .role(ConversationParticipant.ParticipantRole.member)
                .status(ConversationParticipant.ParticipantStatus.accepted)
                .lastReadAt(LocalDateTime.now())
                .joinedAt(LocalDateTime.now())
                .build());

        participantRepository.save(ConversationParticipant.builder()
                .conversationId(conversation.getId())
                .userId(receiverId)
                .role(ConversationParticipant.ParticipantRole.member)
                .status(receiverStatus)
                .joinedAt(LocalDateTime.now())
                .build());

        return conversation.getId();
    }

    private Message.MessageType parseMessageType(String type) {
        if (!hasText(type)) {
            return Message.MessageType.text;
        }
        return switch (type.toLowerCase()) {
            case "image" -> Message.MessageType.image;
            case "video" -> Message.MessageType.video;
            case "call_log" -> Message.MessageType.call_log;
            default -> Message.MessageType.text;
        };
    }

    private ChatDTO.MessageResponse mapToMessageResponse(Message message, String currentUserId) {
        ChatDTO.MessageResponse response = ChatDTO.MessageResponse.builder()
                .id(message.getId())
                .conversationId(message.getConversationId())
                .senderId(message.getSenderId())
                .content(message.getContent())
                .messageType(message.getMessageType() != null ? message.getMessageType().name() : "text")
                .createdAt(message.getCreatedAt())
                .editedAt(message.getEditedAt())
                .deletedAt(message.getDeletedAt())
                .isDeleted(Boolean.TRUE.equals(message.getIsDeleted()))
                .replyToMessageId(message.getReplyToMessageId())
                .attachmentUrl(message.getAttachmentUrl())
                .attachmentName(message.getAttachmentName())
                .attachmentSize(message.getAttachmentSize())
                .build();

        if (currentUserId != null) {
            response.setReactions(cacheService.getReactionCounts(message.getId()));
            response.setUserReactions(cacheService.getUserReactions(message.getId(), currentUserId));
        }
        return response;
    }

    private UserDTO mapToUserDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .avatar(user.getAvatar())
                .email(user.getEmail())
                .role(String.valueOf(user.getRole()))
                .isOnline(cacheService.isUserOnline(user.getId()))
                .build();
    }

    private int normalizeLimit(int limit) {
        if (limit <= 0) {
            return DEFAULT_MESSAGE_LIMIT;
        }
        return Math.min(limit, MAX_MESSAGE_LIMIT);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
