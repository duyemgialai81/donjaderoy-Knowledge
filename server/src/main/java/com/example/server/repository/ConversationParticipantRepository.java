package com.example.server.repository;

import com.example.server.entity.ConversationParticipant;
import com.example.server.entity.ConversationParticipantId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, ConversationParticipantId> {
    List<ConversationParticipant> findByUserId(String userId);
    List<ConversationParticipant> findByConversationId(String conversationId);
}