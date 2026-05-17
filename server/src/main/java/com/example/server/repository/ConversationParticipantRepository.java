package com.example.server.repository;

import com.example.server.entity.ConversationParticipant;
import com.example.server.entity.ConversationParticipantId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, ConversationParticipantId> {
    List<ConversationParticipant> findByUserId(String userId);
    List<ConversationParticipant> findByConversationId(String conversationId);

    @Query("""
            SELECT cp FROM ConversationParticipant cp
            JOIN Conversation c ON c.id = cp.conversationId
            WHERE cp.userId = :userId
            ORDER BY c.updatedAt DESC
            """)
    Page<ConversationParticipant> findConversationPageByUserId(@Param("userId") String userId, Pageable pageable);
}
