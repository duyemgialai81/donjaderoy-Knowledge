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
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private static final int DEFAULT_MESSAGE_LIMIT = 100;
    private static final int MAX_MESSAGE_LIMIT = 200;
    private static final int UNREAD_DISPLAY_CAP = 100;

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
        return cacheService.getCachedMutualFollowers(userId).orElseGet(() -> {
            List<UserDTO> users = userRepository.findMutualFollowers(userId).stream()
                    .map(this::mapToUserDTO)
                    .collect(Collectors.toList());
            cacheService.cacheMutualFollowers(userId, users);
            return users;
        });
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
            assertAcceptedParticipant(conversationId, senderId);
            if (hasText(receiverId)) {
                assertParticipant(conversationId, receiverId);
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
        touchConversationWithLastMessage(conversationId, savedMessage, now);
        markConversationAsRead(conversationId, senderId, now);
        invalidateConversationListCaches(conversationId);
        return mapToMessageResponse(savedMessage, senderId);
    }

    public List<ChatDTO.ConversationItem> getConversations(String userId) {
        return cacheService.getCachedConversations(userId).orElseGet(() -> {
            List<ChatDTO.ConversationItem> conversations = getConversationsPage(userId, 0, 50).getContent();
            cacheService.cacheConversations(userId, conversations);
            return conversations;
        });
    }

    public PageableObject<ChatDTO.ConversationItem> getConversationsPage(String userId, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Page<ConversationParticipant> myParticipants = participantRepository.findConversationPageByUserId(
                userId,
                PageRequest.of(safePage, safeSize)
        );

        List<ChatDTO.ConversationItem> items = buildConversationItems(userId, myParticipants.getContent());

        return new PageableObject<>(
                items,
                myParticipants.getNumber(),
                myParticipants.getSize(),
                myParticipants.getTotalElements(),
                myParticipants.getTotalPages()
        );
    }

    public List<ChatDTO.MessageResponse> getMessagesByConversation(String conversationId, String currentUserId) {
        assertParticipant(conversationId, currentUserId);
        return mapToMessageResponses(
                cacheService.getMessagesByConversation(conversationId, DEFAULT_MESSAGE_LIMIT),
                currentUserId
        );
    }

    public ChatDTO.MessagePageResponse getMessagesByConversationPage(
            String conversationId,
            String beforeMessageId,
            int limit,
            String currentUserId
    ) {
        long startedAtNanos = System.nanoTime();
        assertParticipant(conversationId, currentUserId);

        int pageSize = normalizeLimit(limit);
        int fetchSize = pageSize + 1;
        List<Message> messages;

        if (hasText(beforeMessageId)) {
            Message cursor = cacheService.getMessage(beforeMessageId)
                    .orElseThrow(() -> new IllegalArgumentException("beforeMessageId does not exist"));
            if (!conversationId.equals(cursor.getConversationId())) {
                throw new IllegalArgumentException("beforeMessageId does not belong to this conversation");
            }
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

        List<ChatDTO.MessageResponse> responseMessages = mapToMessageResponses(pageMessages, currentUserId);

        Message nextCursor = pageMessages.isEmpty() ? null : pageMessages.get(0);
        ChatDTO.MessagePageResponse response = ChatDTO.MessagePageResponse.builder()
                .messages(responseMessages)
                .nextBeforeMessageId(hasMore && nextCursor != null ? nextCursor.getId() : null)
                .nextBeforeCreatedAt(hasMore && nextCursor != null ? nextCursor.getCreatedAt() : null)
                .hasMore(hasMore)
                .limit(pageSize)
                .build();
        long elapsedMs = (System.nanoTime() - startedAtNanos) / 1_000_000;
        if (elapsedMs > 1500) {
            log.warn(
                    "Slow message page load conversation={} before={} requestedLimit={} returned={} elapsedMs={}",
                    conversationId,
                    beforeMessageId,
                    pageSize,
                    responseMessages.size(),
                    elapsedMs
            );
        }
        return response;
    }

    public ChatDTO.MessageResponse getMessageWithReactions(String messageId, String currentUserId) {
        return cacheService.getMessage(messageId)
                .map(message -> mapToMessageResponse(message, currentUserId))
                .orElse(null);
    }

    @Transactional
    public ChatDTO.ConversationItem createConversation(ChatDTO.ConversationCreateRequest request, String creatorId) {
        if (request == null) {
            throw new IllegalArgumentException("Conversation request is required");
        }
        if ("direct".equalsIgnoreCase(request.getType())) {
            String receiverId = request.getReceiverId();
            if (!hasText(receiverId)) throw new IllegalArgumentException("Receiver is required");
            String conversationId = getOrCreateDirectConversation(creatorId, receiverId);
            ConversationParticipant participant = participantRepository.findById(new ConversationParticipantId(conversationId, creatorId))
                    .orElseThrow(() -> new IllegalArgumentException("User is not a participant of this conversation"));
            invalidateConversationListCaches(conversationId);
            return buildConversationItem(creatorId, participant);
        }

        LinkedHashSet<String> memberIds = new LinkedHashSet<>();
        memberIds.add(creatorId);
        if (request.getMemberIds() != null) {
            request.getMemberIds().stream()
                    .filter(this::hasText)
                    .forEach(memberIds::add);
        }
        if (memberIds.size() < 3) {
            throw new IllegalArgumentException("Group chat needs at least 3 members");
        }

        LocalDateTime now = LocalDateTime.now();
        Conversation conversation = Conversation.builder()
                .id(UUID.randomUUID().toString())
                .type(Conversation.ConversationType.group)
                .name(hasText(request.getGroupName()) ? request.getGroupName().trim() : "Nhom chat")
                .createdBy(creatorId)
                .createdAt(now)
                .updatedAt(now)
                .build();
        conversationRepository.save(conversation);

        for (String memberId : memberIds) {
            participantRepository.save(ConversationParticipant.builder()
                    .conversationId(conversation.getId())
                    .userId(memberId)
                    .role(memberId.equals(creatorId) ? ConversationParticipant.ParticipantRole.admin : ConversationParticipant.ParticipantRole.member)
                    .status(ConversationParticipant.ParticipantStatus.accepted)
                    .lastReadAt(memberId.equals(creatorId) ? now : null)
                    .joinedAt(now)
                    .build());
        }

        memberIds.forEach(cacheService::invalidateChatListCache);
        ConversationParticipant creatorParticipant = participantRepository.findById(new ConversationParticipantId(conversation.getId(), creatorId))
                .orElseThrow(() -> new IllegalArgumentException("User is not a participant of this conversation"));
        return buildConversationItem(creatorId, creatorParticipant);
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
        updateLastMessageSummaryIfCurrent(saved);
        invalidateConversationListCaches(saved.getConversationId());
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
        Message saved = messageRepository.save(message);
        cacheService.cacheUpdatedMessage(saved);
        refreshLastMessageAfterDelete(saved, now);
        invalidateConversationListCaches(saved.getConversationId());
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
        cacheService.invalidateChatListCache(userId);
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
        invalidateConversationListCaches(conversationId);
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
        invalidateConversationListCaches(conversationId);
    }

    @Transactional
    public ChatDTO.ConversationItem updateConversationBackground(
            String conversationId,
            String userId,
            ChatDTO.ConversationBackgroundRequest request
    ) {
        if (!hasText(conversationId)) {
            throw new IllegalArgumentException("conversationId is required");
        }
        assertParticipant(conversationId, userId);

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation does not exist"));

        String backgroundId = request != null && hasText(request.getBackgroundId())
                ? request.getBackgroundId().trim()
                : "soft";
        String backgroundUrl = request != null && hasText(request.getBackgroundUrl())
                ? request.getBackgroundUrl().trim()
                : null;

        conversation.setBackgroundId(backgroundId);
        conversation.setBackgroundUrl(backgroundUrl);
        conversation.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conversation);
        invalidateConversationListCaches(conversationId);

        ConversationParticipant participant = participantRepository.findById(new ConversationParticipantId(conversationId, userId))
                .orElseThrow(() -> new IllegalArgumentException("User is not a participant of this conversation"));
        return buildConversationItem(userId, participant);
    }

    public Set<String> getParticipantIds(String conversationId) {
        return participantRepository.findByConversationId(conversationId).stream()
                .map(ConversationParticipant::getUserId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    public Set<String> getConversationPeerIds(String userId) {
        List<String> conversationIds = participantRepository.findByUserId(userId).stream()
                .map(ConversationParticipant::getConversationId)
                .toList();
        if (conversationIds.isEmpty()) {
            return Set.of();
        }
        return participantRepository.findByConversationIdIn(conversationIds).stream()
                .map(ConversationParticipant::getUserId)
                .filter(participantId -> !participantId.equals(userId))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    public void setUserOnline(String userId) {
        cacheService.setUserOnline(userId);
    }

    public boolean isUserOnline(String userId) {
        return cacheService.isUserOnline(userId);
    }

    private ChatDTO.ConversationItem buildConversationItem(String userId, ConversationParticipant myPart) {
        return buildConversationItems(userId, List.of(myPart)).stream()
                .findFirst()
                .orElseGet(() -> ChatDTO.ConversationItem.builder()
                        .id(myPart.getConversationId())
                        .status(myPart.getStatus() != null ? myPart.getStatus().name() : "accepted")
                        .build());
    }

    private List<ChatDTO.ConversationItem> buildConversationItems(String userId, List<ConversationParticipant> myParticipants) {
        if (myParticipants == null || myParticipants.isEmpty()) {
            return List.of();
        }

        List<String> conversationIds = myParticipants.stream()
                .map(ConversationParticipant::getConversationId)
                .filter(this::hasText)
                .distinct()
                .toList();
        if (conversationIds.isEmpty()) {
            return List.of();
        }

        Map<String, Conversation> conversationsById = new HashMap<>();
        conversationRepository.findAllById(conversationIds)
                .forEach(conversation -> conversationsById.put(conversation.getId(), conversation));

        Map<String, List<ConversationParticipant>> participantsByConversation = participantRepository
                .findByConversationIdIn(conversationIds)
                .stream()
                .collect(Collectors.groupingBy(
                        ConversationParticipant::getConversationId,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        Map<String, Message> latestMessageByConversation = new HashMap<>();
        for (String conversationId : conversationIds) {
            Conversation conversation = conversationsById.get(conversationId);
            if (hasConversationSummary(conversation)) {
                continue;
            }
            messageRepository.findLatestVisibleMessages(conversationId, PageRequest.of(0, 1))
                    .stream()
                    .findFirst()
                    .ifPresent(message -> latestMessageByConversation.put(conversationId, message));
        }

        Map<String, Integer> unreadByConversation = new HashMap<>();
        for (ConversationParticipant myPart : myParticipants) {
            int unread = messageRepository.findUnreadMessageIdsCapped(
                    myPart.getConversationId(),
                    userId,
                    myPart.getLastReadAt(),
                    PageRequest.of(0, UNREAD_DISPLAY_CAP)
            ).size();
            unreadByConversation.put(myPart.getConversationId(), unread);
        }

        Set<String> userIdsToLoad = new LinkedHashSet<>();
        participantsByConversation.forEach((conversationId, participants) -> {
            Conversation conversation = conversationsById.get(conversationId);
            if (conversation != null && conversation.getType() == Conversation.ConversationType.direct) {
                participants.stream()
                        .map(ConversationParticipant::getUserId)
                        .filter(participantId -> !userId.equals(participantId))
                        .forEach(userIdsToLoad::add);
            }
        });
        conversationsById.values().stream()
                .map(Conversation::getLastMessageSenderId)
                .filter(this::hasText)
                .forEach(userIdsToLoad::add);
        latestMessageByConversation.values().stream()
                .map(Message::getSenderId)
                .filter(this::hasText)
                .forEach(userIdsToLoad::add);

        Map<String, User> usersById = new HashMap<>();
        if (!userIdsToLoad.isEmpty()) {
            userRepository.findAllById(userIdsToLoad)
                    .forEach(user -> usersById.put(user.getId(), user));
        }

        return myParticipants.stream()
                .filter(myPart -> myPart.getStatus() == null
                        || myPart.getStatus() != ConversationParticipant.ParticipantStatus.blocked)
                .map(myPart -> buildConversationItemFromBatch(
                        userId,
                        myPart,
                        conversationsById.get(myPart.getConversationId()),
                        participantsByConversation.getOrDefault(myPart.getConversationId(), List.of()),
                        latestMessageByConversation.get(myPart.getConversationId()),
                        usersById,
                        unreadByConversation.getOrDefault(myPart.getConversationId(), 0)
                ))
                .collect(Collectors.toList());
    }

    private ChatDTO.ConversationItem buildConversationItemFromBatch(
            String userId,
            ConversationParticipant myPart,
            Conversation conversation,
            List<ConversationParticipant> participants,
            Message lastMessage,
            Map<String, User> usersById,
            int unreadCount
    ) {
        String conversationId = myPart.getConversationId();
        ChatDTO.ConversationItem item = ChatDTO.ConversationItem.builder()
                .id(conversationId)
                .status(myPart.getStatus() != null ? myPart.getStatus().name() : "accepted")
                .build();

        if (conversation != null) {
            item.setType(conversation.getType() != null ? conversation.getType().name() : "direct");
            item.setUpdatedAt(conversation.getUpdatedAt());
            item.setBackgroundId(conversation.getBackgroundId());
            item.setBackgroundUrl(conversation.getBackgroundUrl());
            if (conversation.getType() == Conversation.ConversationType.direct) {
                fillDirectConversationTargetFromBatch(item, userId, participants, usersById);
            } else {
                item.setGroupName(conversation.getName());
                item.setMemberCount(participants.size());
            }
        }

        if (hasConversationSummary(conversation)) {
            User sender = usersById.get(conversation.getLastMessageSenderId());
            item.setLastMessage(conversation.getLastMessageText());
            item.setLastMessageTime(conversation.getLastMessageAt());
            item.setLastMessageType(hasText(conversation.getLastMessageType()) ? conversation.getLastMessageType() : "text");
            item.setLastMessageSenderName(sender != null ? sender.getName() : conversation.getLastMessageSenderId());
        } else if (lastMessage == null) {
            item.setLastMessage("Bat dau cuoc tro chuyen...");
            if (conversation != null) {
                item.setLastMessageTime(conversation.getUpdatedAt());
            }
        } else {
            User sender = usersById.get(lastMessage.getSenderId());
            item.setLastMessage(lastMessage.getContent());
            item.setLastMessageTime(lastMessage.getCreatedAt());
            item.setLastMessageType(lastMessage.getMessageType() != null ? lastMessage.getMessageType().name() : "text");
            item.setLastMessageSenderName(sender != null ? sender.getName() : lastMessage.getSenderId());
        }

        item.setUnreadCount(unreadCount);
        return item;
    }

    private void fillDirectConversationTargetFromBatch(
            ChatDTO.ConversationItem item,
            String userId,
            List<ConversationParticipant> participants,
            Map<String, User> usersById
    ) {
        participants.stream()
                .filter(participant -> !participant.getUserId().equals(userId))
                .findFirst()
                .map(participant -> usersById.get(participant.getUserId()))
                .ifPresent(otherUser -> {
                    item.setTargetUserId(otherUser.getId());
                    item.setTargetUserName(otherUser.getName());
                    item.setTargetUserAvatar(otherUser.getAvatar());
                    item.setTargetIsOnline(cacheService.isUserOnline(otherUser.getId()));
                });
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

    private void touchConversationWithLastMessage(String conversationId, Message message, LocalDateTime time) {
        Conversation conversation = conversationRepository.findById(conversationId).orElseThrow();
        applyLastMessageSummary(conversation, message);
        conversation.setUpdatedAt(time);
        conversationRepository.save(conversation);
    }

    private void updateLastMessageSummaryIfCurrent(Message message) {
        Conversation conversation = conversationRepository.findById(message.getConversationId()).orElseThrow();
        if (message.getId().equals(conversation.getLastMessageId())) {
            applyLastMessageSummary(conversation, message);
            conversation.setUpdatedAt(message.getEditedAt() != null ? message.getEditedAt() : LocalDateTime.now());
            conversationRepository.save(conversation);
        }
    }

    private void refreshLastMessageAfterDelete(Message deletedMessage, LocalDateTime time) {
        Conversation conversation = conversationRepository.findById(deletedMessage.getConversationId()).orElseThrow();
        if (deletedMessage.getId().equals(conversation.getLastMessageId())) {
            messageRepository.findLatestVisibleMessages(deletedMessage.getConversationId(), PageRequest.of(0, 1))
                    .stream()
                    .findFirst()
                    .ifPresentOrElse(
                            latest -> applyLastMessageSummary(conversation, latest),
                            () -> clearLastMessageSummary(conversation)
                    );
        }
        conversation.setUpdatedAt(time);
        conversationRepository.save(conversation);
    }

    private void applyLastMessageSummary(Conversation conversation, Message message) {
        conversation.setLastMessageId(message.getId());
        conversation.setLastMessageSenderId(message.getSenderId());
        conversation.setLastMessageType(message.getMessageType() != null ? message.getMessageType().name() : "text");
        conversation.setLastMessageText(truncate(message.getContent(), 1024));
        conversation.setLastMessageAt(message.getCreatedAt());
    }

    private void clearLastMessageSummary(Conversation conversation) {
        conversation.setLastMessageId(null);
        conversation.setLastMessageSenderId(null);
        conversation.setLastMessageType(null);
        conversation.setLastMessageText(null);
        conversation.setLastMessageAt(null);
    }

    private boolean hasConversationSummary(Conversation conversation) {
        return conversation != null && hasText(conversation.getLastMessageId());
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    private void markConversationAsRead(String conversationId, String userId, LocalDateTime readAt) {
        ConversationParticipantId id = new ConversationParticipantId(conversationId, userId);
        ConversationParticipant participant = participantRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User is not a participant of this conversation"));
        participant.setLastReadAt(readAt);
        participantRepository.save(participant);
    }

    private void invalidateConversationListCaches(String conversationId) {
        getParticipantIds(conversationId).forEach(cacheService::invalidateChatListCache);
    }

    private void assertParticipant(String conversationId, String userId) {
        if (!participantRepository.existsById(new ConversationParticipantId(conversationId, userId))) {
            throw new IllegalArgumentException("User is not a participant of this conversation");
        }
    }

    private void assertAcceptedParticipant(String conversationId, String userId) {
        ConversationParticipant participant = participantRepository.findById(new ConversationParticipantId(conversationId, userId))
                .orElseThrow(() -> new IllegalArgumentException("User is not a participant of this conversation"));
        if (participant.getStatus() != ConversationParticipant.ParticipantStatus.accepted) {
            throw new IllegalStateException("Hay chap nhan tin nhan truoc khi gui.");
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
        List<Conversation> existingConversations = conversationRepository.findDirectConversationsBetween(senderId, receiverId);
        if (!existingConversations.isEmpty()) {
            Conversation existing = existingConversations.get(0);
            List<ConversationParticipant> participants = participantRepository.findByConversationId(existing.getId());
            boolean wasRejected = participants.stream()
                    .anyMatch(participant -> participant.getStatus() == ConversationParticipant.ParticipantStatus.blocked);
            if (wasRejected) {
                throw new IllegalStateException("Khong the gui tin nhan. Hoi thoai da bi tu choi.");
            }
            ConversationParticipant senderParticipant = participants.stream()
                    .filter(participant -> participant.getUserId().equals(senderId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("User is not a participant of this conversation"));
            if (senderParticipant.getStatus() != ConversationParticipant.ParticipantStatus.accepted) {
                throw new IllegalStateException("Hay chap nhan tin nhan truoc khi gui.");
            }
            return existing.getId();
        }

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

    private List<ChatDTO.MessageResponse> mapToMessageResponses(List<Message> messages, String currentUserId) {
        if (messages == null || messages.isEmpty()) {
            return List.of();
        }

        Set<String> senderIds = messages.stream()
                .map(Message::getSenderId)
                .filter(this::hasText)
                .collect(Collectors.toSet());
        Map<String, User> usersById = new HashMap<>();
        userRepository.findAllById(senderIds).forEach(user -> usersById.put(user.getId(), user));

        List<String> messageIds = messages.stream()
                .map(Message::getId)
                .filter(this::hasText)
                .toList();
        Map<String, Map<String, Long>> reactionCountsByMessage = new HashMap<>();
        Map<String, Map<String, Boolean>> userReactionsByMessage = new HashMap<>();
        if (currentUserId != null && !messageIds.isEmpty()) {
            for (com.example.server.entity.MessageReaction reaction : messageReactionRepository.findByMessageIdIn(messageIds)) {
                if (!hasText(reaction.getMessageId()) || !hasText(reaction.getEmoji())) {
                    continue;
                }
                reactionCountsByMessage
                        .computeIfAbsent(reaction.getMessageId(), ignored -> new HashMap<>())
                        .merge(reaction.getEmoji(), 1L, Long::sum);
                if (currentUserId.equals(reaction.getUserId())) {
                    userReactionsByMessage
                            .computeIfAbsent(reaction.getMessageId(), ignored -> new HashMap<>())
                            .put(reaction.getEmoji(), true);
                }
            }
        }

        return messages.stream()
                .map(message -> mapToMessageResponse(
                        message,
                        usersById.get(message.getSenderId()),
                        reactionCountsByMessage.get(message.getId()),
                        userReactionsByMessage.get(message.getId())
                ))
                .collect(Collectors.toList());
    }

    private ChatDTO.MessageResponse mapToMessageResponse(Message message, String currentUserId) {
        List<ChatDTO.MessageResponse> responses = mapToMessageResponses(List.of(message), currentUserId);
        if (responses.isEmpty()) {
            return null;
        }
        return responses.get(0);
    }

    private ChatDTO.MessageResponse mapToMessageResponse(
            Message message,
            User sender,
            Map<String, Long> reactionCounts,
            Map<String, Boolean> userReactions
    ) {
        ChatDTO.MessageResponse response = ChatDTO.MessageResponse.builder()
                .id(message.getId())
                .conversationId(message.getConversationId())
                .senderId(message.getSenderId())
                .senderName(sender != null ? sender.getName() : null)
                .senderAvatar(sender != null ? sender.getAvatar() : null)
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

        response.setReactions(reactionCounts != null ? reactionCounts : Map.of());
        response.setUserReactions(userReactions != null ? userReactions : Map.of());
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
