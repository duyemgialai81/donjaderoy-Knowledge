package com.example.server.repository;

import com.example.server.entity.Message;
import com.example.server.entity.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MessageReactionRepository extends JpaRepository<MessageReaction, String> {

    Optional<MessageReaction> findByMessageIdAndUserIdAndEmoji(String messageId, String userId, String emoji);

    List<MessageReaction> findByMessageId(String messageId);

    @Query("SELECT DISTINCT mr.emoji FROM MessageReaction mr WHERE mr.messageId = :messageId")
    List<String> findDistinctEmojisByMessageId(String messageId);

    long countByMessageIdAndEmoji(String messageId, String emoji);

    void deleteByMessageIdAndUserId(String messageId, String userId);
}