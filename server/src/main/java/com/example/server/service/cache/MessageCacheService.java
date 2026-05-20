package com.example.server.service.cache;

import com.example.server.entity.Message;
import com.example.server.entity.MessageReaction;
import com.example.server.model.dto.ChatDTO;
import com.example.server.model.dto.UserDTO;
import com.example.server.repository.MessageReactionRepository;
import com.example.server.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageCacheService {

    private static final int MAX_CACHED_MESSAGES_PER_CONVERSATION = 1000;
    private static final int MAX_MESSAGE_PAGE_SIZE = 201;

    private static final String KEY_MESSAGE = "chat:message:";
    private static final String KEY_CONVERSATION_MESSAGES = "chat:conversation:messages:";
    private static final String KEY_REACTION_COUNTS = "chat:message:reaction-counts:";
    private static final String KEY_USER_REACTION = "chat:message:user-reaction:";
    private static final String KEY_USER_ONLINE = "chat:user-online:";
    private static final String KEY_CHAT_MUTUAL_FOLLOWERS = "chat:mutual-followers:";
    private static final String KEY_CHAT_CONVERSATIONS = "chat:conversations:";

    public static final Set<String> ALLOWED_EMOJIS = Set.of(
            "\u2764\uFE0F",
            "\uD83D\uDE02",
            "\uD83D\uDE06",
            "\uD83D\uDC4D",
            "\uD83D\uDE2E",
            "\uD83D\uDE22",
            "\uD83D\uDE21",
            "\uD83C\uDF89",
            "\uD83D\uDC4E",
            "\uD83D\uDD25",
            "\u2B50",
            "\uD83D\uDCAF"
    );

    private final RedisTemplate<String, Object> redisTemplate;
    private final ValueOperations<String, Object> valueOps;
    private final HashOperations<String, String, Object> hashOps;
    private final ListOperations<String, Object> listOps;

    private final MessageRepository messageRepository;
    private final MessageReactionRepository reactionRepository;

    @Value("${cache.messages.ttl-minutes:30}")
    private long messagesTtlMinutes;

    @Value("${cache.reactions.ttl-minutes:60}")
    private long reactionsTtlMinutes;

    @Value("${cache.user-online.ttl-minutes:15}")
    private long userOnlineTtlMinutes;

    @Value("${cache.chat-list.ttl-seconds:45}")
    private long chatListTtlSeconds;

    public Optional<Message> getMessage(String messageId) {
        String key = messageKey(messageId);
        try {
            Object cached = valueOps.get(key);
            if (cached instanceof Message message) {
                redisTemplate.expire(key, ttl(messagesTtlMinutes));
                return Optional.of(message);
            }
        } catch (Exception e) {
            log.warn("Redis message cache read failed for {}", messageId, e);
        }

        Optional<Message> dbMessage = messageRepository.findById(messageId);
        dbMessage.ifPresent(message -> {
            try {
                cacheMessage(message);
            } catch (Exception e) {
                log.warn("Redis message cache write failed for {}", messageId, e);
            }
        });
        return dbMessage;
    }

    @Transactional
    public Message saveMessageWithCache(Message message) {
        Message saved = messageRepository.save(message);
        try {
            cacheMessage(saved);
            appendConversationMessage(saved.getConversationId(), saved.getId());
        } catch (Exception e) {
            log.warn("Redis message cache write failed for {}", saved.getId(), e);
        }
        return saved;
    }

    public List<Message> getMessagesByConversation(String conversationId, int limit) {
        int safeLimit = normalizeLimit(limit);
        List<Message> latestDesc = messageRepository.findLatestVisibleMessages(
                conversationId,
                PageRequest.of(0, safeLimit)
        );
        List<Message> latestAsc = reverseToAscending(latestDesc);
        try {
            rebuildConversationCache(conversationId, latestAsc);
        } catch (Exception e) {
            log.warn("Redis conversation cache rebuild failed for {}", conversationId, e);
        }
        return latestAsc;
    }

    public List<Message> getMessagesBefore(String conversationId, LocalDateTime beforeCreatedAt, String beforeId, int limit) {
        int safeLimit = normalizeLimit(limit);
        List<Message> messagesDesc = messageRepository.findVisibleMessagesBefore(
                conversationId,
                beforeCreatedAt,
                beforeId,
                PageRequest.of(0, safeLimit)
        );
        List<Message> messagesAsc = reverseToAscending(messagesDesc);
        messagesAsc.forEach(message -> {
            try {
                cacheMessage(message);
            } catch (Exception e) {
                log.warn("Redis message cache write failed for {}", message.getId(), e);
            }
        });
        return messagesAsc;
    }

    public Optional<List<UserDTO>> getCachedMutualFollowers(String userId) {
        String key = chatMutualFollowersKey(userId);
        try {
            Object cached = valueOps.get(key);
            if (cached instanceof List<?> list) {
                List<UserDTO> users = list.stream()
                        .filter(UserDTO.class::isInstance)
                        .map(UserDTO.class::cast)
                        .toList();
                if (users.size() == list.size()) {
                    redisTemplate.expire(key, chatListTtl());
                    return Optional.of(users);
                }
            }
        } catch (Exception e) {
            log.warn("Redis mutual followers cache read failed for user {}", userId, e);
        }
        return Optional.empty();
    }

    public void cacheMutualFollowers(String userId, List<UserDTO> users) {
        try {
            valueOps.set(chatMutualFollowersKey(userId), new ArrayList<>(users), chatListTtl());
        } catch (Exception e) {
            log.warn("Redis mutual followers cache write failed for user {}", userId, e);
        }
    }

    public Optional<List<ChatDTO.ConversationItem>> getCachedConversations(String userId) {
        String key = chatConversationsKey(userId);
        try {
            Object cached = valueOps.get(key);
            if (cached instanceof List<?> list) {
                List<ChatDTO.ConversationItem> conversations = list.stream()
                        .filter(ChatDTO.ConversationItem.class::isInstance)
                        .map(ChatDTO.ConversationItem.class::cast)
                        .toList();
                if (conversations.size() == list.size()) {
                    redisTemplate.expire(key, chatListTtl());
                    return Optional.of(conversations);
                }
            }
        } catch (Exception e) {
            log.warn("Redis conversations cache read failed for user {}", userId, e);
        }
        return Optional.empty();
    }

    public void cacheConversations(String userId, List<ChatDTO.ConversationItem> conversations) {
        try {
            valueOps.set(chatConversationsKey(userId), new ArrayList<>(conversations), chatListTtl());
        } catch (Exception e) {
            log.warn("Redis conversations cache write failed for user {}", userId, e);
        }
    }

    public void invalidateChatListCache(String userId) {
        safeDelete(chatConversationsKey(userId));
    }

    public void cacheUpdatedMessage(Message message) {
        try {
            cacheMessage(message);
        } catch (Exception e) {
            log.warn("Redis message cache update failed for {}", message.getId(), e);
        }
    }

    @Transactional
    public boolean toggleReaction(String messageId, String userId, String emoji) {
        List<MessageReaction> currentReactions = reactionRepository.findAllByMessageIdAndUserId(messageId, userId);
        Optional<MessageReaction> currentReaction = currentReactions.stream().findFirst();

        if (currentReaction.isPresent() && emoji.equals(currentReaction.get().getEmoji())) {
            currentReactions.forEach(reaction -> {
                reactionRepository.delete(reaction);
                decrementReactionCount(messageId, reaction.getEmoji());
            });
            safeDelete(userReactionKey(messageId, userId));
            return false;
        }

        currentReactions.forEach(existing -> {
            reactionRepository.delete(existing);
            decrementReactionCount(messageId, existing.getEmoji());
        });

        MessageReaction saved = MessageReaction.builder()
                .id(UUID.randomUUID().toString())
                .messageId(messageId)
                .userId(userId)
                .emoji(emoji)
                .createdAt(LocalDateTime.now())
                .build();
        reactionRepository.save(saved);

        try {
            valueOps.set(userReactionKey(messageId, userId), emoji, ttl(reactionsTtlMinutes));
            hashOps.increment(reactionCountsKey(messageId), emoji, 1);
            redisTemplate.expire(reactionCountsKey(messageId), ttl(reactionsTtlMinutes));
        } catch (Exception e) {
            log.warn("Redis reaction cache write failed for message {}", messageId, e);
        }
        return true;
    }

    public Map<String, Long> getReactionCounts(String messageId) {
        String key = reactionCountsKey(messageId);
        try {
            Map<String, Long> cachedCounts = readLongHash(key);
            if (!cachedCounts.isEmpty()) {
                redisTemplate.expire(key, ttl(reactionsTtlMinutes));
                return cachedCounts;
            }
        } catch (Exception e) {
            log.warn("Redis reaction cache read failed for message {}", messageId, e);
        }

        Map<String, Long> dbCounts = reactionRepository.findByMessageId(messageId).stream()
                .collect(Collectors.groupingBy(
                        MessageReaction::getEmoji,
                        LinkedHashMap::new,
                        Collectors.counting()
                ));
        if (!dbCounts.isEmpty()) {
            try {
                dbCounts.forEach((emoji, count) -> hashOps.put(key, emoji, count));
                redisTemplate.expire(key, ttl(reactionsTtlMinutes));
            } catch (Exception e) {
                log.warn("Redis reaction cache rebuild failed for message {}", messageId, e);
            }
        }
        return dbCounts;
    }

    public boolean hasUserReacted(String messageId, String userId, String emoji) {
        return emoji.equals(getUserReaction(messageId, userId).orElse(null));
    }

    public Map<String, Boolean> getUserReactions(String messageId, String userId) {
        Optional<String> selectedEmoji = getUserReaction(messageId, userId);
        Map<String, Boolean> result = new HashMap<>();
        for (String emoji : ALLOWED_EMOJIS) {
            result.put(emoji, selectedEmoji.filter(emoji::equals).isPresent());
        }
        return result;
    }

    public void setUserOnline(String userId) {
        try {
            valueOps.set(KEY_USER_ONLINE + userId, System.currentTimeMillis(), ttl(userOnlineTtlMinutes));
        } catch (Exception e) {
            log.warn("Redis online status write failed for user {}", userId, e);
        }
    }

    public boolean isUserOnline(String userId) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_USER_ONLINE + userId));
        } catch (Exception e) {
            log.warn("Redis online status read failed for user {}", userId, e);
            return false;
        }
    }

    public Set<String> filterOnlineUsers(Set<String> userIds) {
        return userIds.stream()
                .filter(this::isUserOnline)
                .collect(Collectors.toSet());
    }

    public void invalidateConversationCache(String conversationId) {
        safeDelete(conversationMessagesKey(conversationId));
    }

    public void invalidateMessageCache(String messageId) {
        safeDelete(messageKey(messageId));
        safeDelete(reactionCountsKey(messageId));
    }

    public boolean isRedisHealthy() {
        try {
            RedisConnectionFactory factory = redisTemplate.getConnectionFactory();
            return factory != null && "PONG".equalsIgnoreCase(factory.getConnection().ping());
        } catch (Exception e) {
            log.error("Redis health check failed", e);
            return false;
        }
    }

    public static boolean isValidEmoji(String emoji) {
        return ALLOWED_EMOJIS.contains(emoji);
    }

    private Optional<String> getUserReaction(String messageId, String userId) {
        String key = userReactionKey(messageId, userId);
        try {
            Object cached = valueOps.get(key);
            if (cached != null) {
                redisTemplate.expire(key, ttl(reactionsTtlMinutes));
                return Optional.of(String.valueOf(cached));
            }
        } catch (Exception e) {
            log.warn("Redis user reaction cache read failed for message {}", messageId, e);
        }

        Optional<String> dbEmoji = reactionRepository.findAllByMessageIdAndUserId(messageId, userId).stream()
                .findFirst()
                .map(MessageReaction::getEmoji);
        dbEmoji.ifPresent(emoji -> {
            try {
                valueOps.set(key, emoji, ttl(reactionsTtlMinutes));
            } catch (Exception e) {
                log.warn("Redis user reaction cache write failed for message {}", messageId, e);
            }
        });
        return dbEmoji;
    }

    private void cacheMessage(Message message) {
        valueOps.set(messageKey(message.getId()), message, ttl(messagesTtlMinutes));
    }

    private void appendConversationMessage(String conversationId, String messageId) {
        String key = conversationMessagesKey(conversationId);
        listOps.rightPush(key, messageId);
        listOps.trim(key, -MAX_CACHED_MESSAGES_PER_CONVERSATION, -1);
        redisTemplate.expire(key, ttl(messagesTtlMinutes));
    }

    private void rebuildConversationCache(String conversationId, List<Message> messages) {
        String key = conversationMessagesKey(conversationId);
        redisTemplate.delete(key);
        for (Message message : messages) {
            if (!conversationId.equals(message.getConversationId())) {
                log.warn("Skipped cross-conversation message {} while rebuilding cache for {}", message.getId(), conversationId);
                continue;
            }
            cacheMessage(message);
            listOps.rightPush(key, message.getId());
        }
        if (!messages.isEmpty()) {
            listOps.trim(key, -MAX_CACHED_MESSAGES_PER_CONVERSATION, -1);
            redisTemplate.expire(key, ttl(messagesTtlMinutes));
        }
    }

    private List<Message> hydrateMessages(List<Object> ids) {
        List<Message> messages = new ArrayList<>();
        for (Object id : ids) {
            if (id != null) {
                getMessage(String.valueOf(id)).ifPresent(messages::add);
            }
        }
        return messages;
    }

    private List<Message> reverseToAscending(List<Message> messagesDesc) {
        List<Message> result = new ArrayList<>(messagesDesc);
        Collections.reverse(result);
        return result;
    }

    private List<Message> sortAscending(List<Message> messages) {
        return messages.stream()
                .sorted(Comparator.comparing(Message::getCreatedAt).thenComparing(Message::getId))
                .toList();
    }

    private void decrementReactionCount(String messageId, String emoji) {
        try {
            String key = reactionCountsKey(messageId);
            Object current = hashOps.get(key, emoji);
            long count = current == null ? reactionRepository.countByMessageIdAndEmoji(messageId, emoji) + 1 : parseLong(current);
            if (count <= 1) {
                hashOps.delete(key, emoji);
            } else {
                hashOps.put(key, emoji, count - 1);
            }
            redisTemplate.expire(key, ttl(reactionsTtlMinutes));
        } catch (Exception e) {
            log.warn("Redis reaction cache decrement failed for message {}", messageId, e);
        }
    }

    private Map<String, Long> readLongHash(String key) {
        Map<String, Long> result = new HashMap<>();
        Map<String, Object> rawEntries = hashOps.entries(key);
        for (Map.Entry<String, Object> entry : rawEntries.entrySet()) {
            if (entry.getKey() != null && entry.getValue() != null) {
                result.put(entry.getKey(), parseLong(entry.getValue()));
            }
        }
        return result;
    }

    private long parseLong(Object value) {
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private int normalizeLimit(int limit) {
        if (limit <= 0) {
            return 50;
        }
        return Math.min(limit, MAX_MESSAGE_PAGE_SIZE);
    }

    private Duration ttl(long minutes) {
        return Duration.ofMinutes(Math.max(1, minutes));
    }

    private Duration chatListTtl() {
        return Duration.ofSeconds(Math.max(5, chatListTtlSeconds));
    }

    private String messageKey(String messageId) {
        return KEY_MESSAGE + messageId;
    }

    private String conversationMessagesKey(String conversationId) {
        return KEY_CONVERSATION_MESSAGES + conversationId;
    }

    private String reactionCountsKey(String messageId) {
        return KEY_REACTION_COUNTS + messageId;
    }

    private String userReactionKey(String messageId, String userId) {
        return KEY_USER_REACTION + messageId + ":" + userId;
    }

    private String chatMutualFollowersKey(String userId) {
        return KEY_CHAT_MUTUAL_FOLLOWERS + userId;
    }

    private String chatConversationsKey(String userId) {
        return KEY_CHAT_CONVERSATIONS + userId;
    }

    private void safeDelete(String key) {
        try {
            redisTemplate.delete(key);
        } catch (Exception e) {
            log.warn("Redis cache delete failed for key {}", key, e);
        }
    }
}
