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
    List<ConversationParticipant> findByConversationIdIn(List<String> conversationIds);

    @Query(
            value = """
                    SELECT cp.*
                    FROM conversation_participants cp
                    JOIN conversations c ON c.id = cp.conversation_id
                    WHERE cp.user_id = :userId
                      AND (cp.status IS NULL OR cp.status <> 'blocked')
                    ORDER BY c.updated_at DESC, c.id DESC
                    """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM conversation_participants cp
                    WHERE cp.user_id = :userId
                      AND (cp.status IS NULL OR cp.status <> 'blocked')
                    """,
            nativeQuery = true
    )
    Page<ConversationParticipant> findConversationPageByUserId(@Param("userId") String userId, Pageable pageable);
}
