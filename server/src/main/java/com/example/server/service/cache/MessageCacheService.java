package com.example.server.service.cache;

import com.example.server.entity.Message;
import com.example.server.entity.MessageReaction;
import com.example.server.repository.MessageReactionRepository;
import com.example.server.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageCacheService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ValueOperations<String, Object> valueOps;
    private final HashOperations<String, String, Object> hashOps;
    private final ListOperations<String, Object> listOps;
    private final SetOperations<String, Object> setOps;

    private final MessageRepository messageRepository;
    private final MessageReactionRepository reactionRepository;

    @Value("${cache.messages.ttl-minutes:30}")
    private long messagesTtlMinutes;

    @Value("${cache.reactions.ttl-minutes:60}")
    private long reactionsTtlMinutes;

    // ==================== KEY PATTERNS ====================
    private static final String KEY_MESSAGE = "msg:";
    private static final String KEY_CONV_MESSAGES = "conv:msgs:";
    private static final String KEY_REACTION = "react:";
    private static final String KEY_REACTION_SET = "reacts:";
    private static final String KEY_USER_ONLINE = "online:";

    // ==================== MESSAGE CACHE ====================

    public Optional<Message> getMessage(String messageId) {
        String key = KEY_MESSAGE + messageId;

        Object cached = valueOps.get(key);
        if (cached instanceof Message msg) {
            log.debug("Cache HIT for message: {}", messageId);
            redisTemplate.expire(key, Duration.ofMinutes(messagesTtlMinutes));
            return Optional.of(msg);
        }

        log.debug("Cache MISS for message: {}, querying DB...", messageId);
        Optional<Message> dbMessage = messageRepository.findById(messageId);

        dbMessage.ifPresent(msg -> {
            valueOps.set(key, msg, Duration.ofMinutes(messagesTtlMinutes));
            addToConversationIndex(msg.getConversationId(), messageId);
        });

        return dbMessage;
    }

    @Transactional
    public Message saveMessageWithCache(Message message) {
        Message saved = messageRepository.save(message);

        String msgKey = KEY_MESSAGE + saved.getId();
        valueOps.set(msgKey, saved, Duration.ofMinutes(messagesTtlMinutes));

        String convKey = KEY_CONV_MESSAGES + saved.getConversationId();
        listOps.rightPush(convKey, saved.getId());
        redisTemplate.expire(convKey, Duration.ofMinutes(messagesTtlMinutes));
        listOps.trim(convKey, -1000, -1);

        log.debug("Cached message {} in conversation {}", saved.getId(), saved.getConversationId());
        return saved;
    }

    public List<Message> getMessagesByConversation(String conversationId, int limit) {
        String convKey = KEY_CONV_MESSAGES + conversationId;

        List<Object> msgIds = listOps.range(convKey, -limit, -1);

        if (msgIds != null && !msgIds.isEmpty()) {
            List<Message> messages = new ArrayList<>();
            List<String> missingIds = new ArrayList<>();

            for (Object idObj : msgIds) {
                String msgId = (String) idObj;
                getMessage(msgId).ifPresentOrElse(
                        messages::add,
                        () -> missingIds.add(msgId)
                );
            }

            if (!missingIds.isEmpty()) {
                List<Message> dbMessages = messageRepository.findAllById(missingIds);
                messages.addAll(dbMessages);
            }

            return messages.stream()
                    .sorted(Comparator.comparing(Message::getCreatedAt))
                    .limit(limit)
                    .collect(Collectors.toList());
        }

        log.info("Cache empty for conversation {}, fetching from DB", conversationId);
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream().limit(limit).collect(Collectors.toList());
    }

    private void addToConversationIndex(String conversationId, String messageId) {
        String convKey = KEY_CONV_MESSAGES + conversationId;
        listOps.rightPush(convKey, messageId);
        redisTemplate.expire(convKey, Duration.ofMinutes(messagesTtlMinutes));
        listOps.trim(convKey, -1000, -1);
    }

    // ==================== REACTION CACHE ====================

    @Transactional
    public MessageReaction saveReactionWithCache(MessageReaction reaction) {
        MessageReaction saved = reactionRepository.save(reaction);

        // ✅ FIX 2: toEpochSecond cần ZoneOffset
        String reactKey = KEY_REACTION + reaction.getMessageId() + ":" +
                reaction.getUserId() + ":" + reaction.getEmoji();
        valueOps.set(reactKey,
                saved.getCreatedAt().toEpochSecond(ZoneOffset.UTC),
                Duration.ofMinutes(reactionsTtlMinutes));

        String counterKey = KEY_REACTION_SET + reaction.getMessageId();
        String emoji = reaction.getEmoji();

        hashOps.increment(counterKey, emoji, 1);
        redisTemplate.expire(counterKey, Duration.ofMinutes(reactionsTtlMinutes));

        setOps.add(counterKey + ":users", reaction.getUserId() + ":" + emoji);

        log.debug("Cached reaction: {} -> {} on message {}",
                reaction.getUserId(), reaction.getEmoji(), reaction.getMessageId());
        return saved;
    }

    public Map<String, Long> getReactionCounts(String messageId) {
        String key = MessageReaction.getRedisSetKey(messageId);

        // Lấy nguyên bản dưới dạng Object từ Redis
        Map<Object, Object> rawEntries = redisTemplate.opsForHash().entries(key);
        Map<String, Long> result = new HashMap<>();

        // Chuyển đổi an toàn từng phần tử
        for (Map.Entry<Object, Object> entry : rawEntries.entrySet()) {
            if (entry.getKey() != null && entry.getValue() != null) {
                String emoji = String.valueOf(entry.getKey());
                Long count = Long.parseLong(String.valueOf(entry.getValue()));
                result.put(emoji, count);
            }
        }

        return result;
    }

    @Transactional
    public boolean toggleReaction(String messageId, String userId, String emoji) {
        String reactionKey = MessageReaction.getRedisSetKey(messageId);
        String userReactionKey = "user_reaction:" + messageId + ":" + userId;

        // Lấy reaction hiện tại của user từ Redis
        Object rawCurrentReaction = redisTemplate.opsForValue().get(userReactionKey);
        String currentReaction = rawCurrentReaction != null ? String.valueOf(rawCurrentReaction) : null;

        // TRƯỜNG HỢP 1: Bấm lại vào emoji cũ -> Xoá thả cảm xúc (Unlike)
        if (currentReaction != null && currentReaction.equals(emoji)) {
            redisTemplate.delete(userReactionKey);

            // Giảm an toàn số lượng (chống ClassCastException)
            Object rawCount = redisTemplate.opsForHash().get(reactionKey, emoji);
            if (rawCount != null) {
                long count = Long.parseLong(String.valueOf(rawCount));
                if (count > 1) {
                    redisTemplate.opsForHash().put(reactionKey, emoji, String.valueOf(count - 1));
                } else {
                    redisTemplate.opsForHash().delete(reactionKey, emoji);
                }
            }
            return false; // Trả về false nghĩa là đã gỡ reaction
        }

        // TRƯỜNG HỢP 2: Bấm vào emoji mới (hoặc chưa từng thả)
        else {
            // Xoá số đếm của emoji cũ (nếu trước đó đã thả cái khác)
            if (currentReaction != null) {
                Object rawOldCount = redisTemplate.opsForHash().get(reactionKey, currentReaction);
                if (rawOldCount != null) {
                    long oldCount = Long.parseLong(String.valueOf(rawOldCount));
                    if (oldCount > 1) {
                        redisTemplate.opsForHash().put(reactionKey, currentReaction, String.valueOf(oldCount - 1));
                    } else {
                        redisTemplate.opsForHash().delete(reactionKey, currentReaction);
                    }
                }
            }

            // Lưu emoji mới của user
            redisTemplate.opsForValue().set(userReactionKey, emoji);

            // Tăng an toàn số lượng emoji mới (chống ClassCastException)
            Object rawNewCount = redisTemplate.opsForHash().get(reactionKey, emoji);
            long newCount = rawNewCount != null ? Long.parseLong(String.valueOf(rawNewCount)) : 0L;
            redisTemplate.opsForHash().put(reactionKey, emoji, String.valueOf(newCount + 1));

            return true; // Trả về true nghĩa là đã thả reaction mới
        }
    }

    public boolean hasUserReacted(String messageId, String userId, String emoji) {
        String key = KEY_REACTION + messageId + ":" + userId + ":" + emoji;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    public Map<String, Boolean> getUserReactions(String messageId, String userId) {
        Map<String, Boolean> userReactions = new HashMap<>();
        for (String emoji : ALLOWED_EMOJIS) {
            userReactions.put(emoji, hasUserReacted(messageId, userId, emoji));
        }
        return userReactions;
    }

    // ==================== USER ONLINE STATUS ====================

    public void setUserOnline(String userId) {
        String key = KEY_USER_ONLINE + userId;
        valueOps.set(key, System.currentTimeMillis(), Duration.ofMinutes(15));
    }

    public boolean isUserOnline(String userId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_USER_ONLINE + userId));
    }

    public Set<String> filterOnlineUsers(Collection<String> userIds) {
        return userIds.stream()
                .filter(this::isUserOnline)
                .collect(Collectors.toSet());
    }

    // ==================== CACHE MANAGEMENT ====================

    public void invalidateConversationCache(String conversationId) {
        String convKey = KEY_CONV_MESSAGES + conversationId;
        redisTemplate.delete(convKey);
        log.info("Invalidated cache for conversation: {}", conversationId);
    }

    public void invalidateMessageCache(String messageId) {
        redisTemplate.delete(KEY_MESSAGE + messageId);
        String reactCounterKey = KEY_REACTION_SET + messageId;
        redisTemplate.delete(reactCounterKey);
        redisTemplate.delete(reactCounterKey + ":users");
        log.debug("Invalidated cache for message: {}", messageId);
    }

    public boolean isRedisHealthy() {
        try {
            return redisTemplate.getConnectionFactory().getConnection().ping().equalsIgnoreCase("PONG");
        } catch (Exception e) {
            log.error("Redis health check failed", e);
            return false;
        }
    }

    // ==================== CONSTANTS ====================

    public static final Set<String> ALLOWED_EMOJIS = Set.of(
            "❤️", "😂", "👍", "😮", "😢", "🎉", "👎", "🔥", "⭐", "💯"
    );

    public static boolean isValidEmoji(String emoji) {
        return ALLOWED_EMOJIS.contains(emoji);
    }
}