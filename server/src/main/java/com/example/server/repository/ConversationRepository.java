package com.example.server.repository;

import com.example.server.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, String> {
    @Query(value = """
            SELECT c.* FROM conversations c
            JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
            JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
            WHERE c.type = 'direct'
              AND cp1.user_id = :userA
              AND cp2.user_id = :userB
              AND (
                  SELECT COUNT(DISTINCT cp_all.user_id)
                  FROM conversation_participants cp_all
                  WHERE cp_all.conversation_id = c.id
              ) = 2
            ORDER BY c.updated_at DESC
            """, nativeQuery = true)
    List<Conversation> findDirectConversationsBetween(@Param("userA") String userA, @Param("userB") String userB);
}
