USE duyem;

-- Run once after applying tidb-performance-indexes.sql.
-- This fills conversation last-message summaries for existing imported data.
UPDATE conversations c
JOIN (
    SELECT ranked.id,
           ranked.conversation_id,
           ranked.sender_id,
           ranked.message_type,
           LEFT(ranked.content, 1024) AS content,
           ranked.created_at
    FROM (
        SELECT m.*,
               ROW_NUMBER() OVER (
                   PARTITION BY m.conversation_id
                   ORDER BY m.created_at DESC, m.id DESC
               ) AS row_no
        FROM messages m
        WHERE m.is_deleted = false OR m.is_deleted IS NULL
    ) ranked
    WHERE ranked.row_no = 1
) latest ON latest.conversation_id = c.id
SET c.last_message_id = latest.id,
    c.last_message_sender_id = latest.sender_id,
    c.last_message_type = latest.message_type,
    c.last_message_text = latest.content,
    c.last_message_at = latest.created_at,
    c.updated_at = COALESCE(c.updated_at, latest.created_at);

ANALYZE TABLE conversations;
ANALYZE TABLE conversation_participants;
ANALYZE TABLE messages;
