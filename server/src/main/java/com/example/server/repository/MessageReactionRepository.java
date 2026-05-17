package com.example.server.repository;

import com.example.server.entity.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MessageReactionRepository extends JpaRepository<MessageReaction, String> {

    Optional<MessageReaction> findByMessageIdAndUserIdAndEmoji(String messageId, String userId, String emoji);
    Optional<MessageReaction> findByMessageIdAndUserId(String messageId, String userId);
    List<MessageReaction> findAllByMessageIdAndUserId(String messageId, String userId);

    List<MessageReaction> findByMessageId(String messageId);

    @Query("SELECT DISTINCT mr.emoji FROM MessageReaction mr WHERE mr.messageId = :messageId")
    List<String> findDistinctEmojisByMessageId(String messageId);

    long countByMessageIdAndEmoji(String messageId, String emoji);

    @Query("SELECT COUNT(DISTINCT mr.userId) FROM MessageReaction mr WHERE mr.messageId = :messageId")
    long countDistinctUsersByMessageId(@Param("messageId") String messageId);

    void deleteByMessageIdAndUserId(String messageId, String userId);
}
