package com.example.the_autumn.repository;

import com.example.the_autumn.entity.ConversationParticipant;
import com.example.the_autumn.entity.ConversationParticipantId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, ConversationParticipantId> {
    List<ConversationParticipant> findByUserId(String userId);
    List<ConversationParticipant> findByConversationId(String conversationId);
}