package com.example.server.repository;

import com.example.server.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, String> {
    List<Message> findByConversationIdOrderByCreatedAtAsc(String conversationId);
    List<Message> findByConversationIdOrderByCreatedAtDesc(String conversationId, Pageable pageable);

    @Query("SELECT m FROM Message m WHERE m.conversationId = :convId AND m.createdAt > :since ORDER BY m.createdAt ASC")
    List<Message> findNewMessagesSince(@Param("convId") String convId, @Param("since") LocalDateTime since);

    @Query("""
            SELECT m FROM Message m
            WHERE m.conversationId = :conversationId
              AND (m.isDeleted = false OR m.isDeleted IS NULL)
            ORDER BY m.createdAt DESC, m.id DESC
            """)
    List<Message> findLatestVisibleMessages(@Param("conversationId") String conversationId, Pageable pageable);

    @Query("""
            SELECT m FROM Message m
            WHERE m.conversationId = :conversationId
              AND (
                    m.createdAt < :beforeCreatedAt
                    OR (m.createdAt = :beforeCreatedAt AND m.id < :beforeId)
                  )
            ORDER BY m.createdAt DESC, m.id DESC
            """)
    List<Message> findVisibleMessagesBefore(@Param("conversationId") String conversationId,
                                            @Param("beforeCreatedAt") LocalDateTime beforeCreatedAt,
                                            @Param("beforeId") String beforeId,
                                            Pageable pageable);

    @Query("""
            SELECT COUNT(m) FROM Message m
            WHERE m.conversationId = :conversationId
              AND m.senderId <> :userId
              AND (m.isDeleted = false OR m.isDeleted IS NULL)
              AND (:lastReadAt IS NULL OR m.createdAt > :lastReadAt)
            """)
    long countUnreadMessages(@Param("conversationId") String conversationId,
                             @Param("userId") String userId,
                             @Param("lastReadAt") LocalDateTime lastReadAt);

    @Query("""
            SELECT m.id FROM Message m
            WHERE m.conversationId = :conversationId
              AND m.senderId <> :userId
              AND (m.isDeleted = false OR m.isDeleted IS NULL)
              AND (:lastReadAt IS NULL OR m.createdAt > :lastReadAt)
            ORDER BY m.createdAt DESC, m.id DESC
            """)
    List<String> findUnreadMessageIdsCapped(@Param("conversationId") String conversationId,
                                            @Param("userId") String userId,
                                            @Param("lastReadAt") LocalDateTime lastReadAt,
                                            Pageable pageable);
}
