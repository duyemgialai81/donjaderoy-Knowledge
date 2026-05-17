USE duyem;

-- Chat hot path: conversation list, latest messages, cursor pagination, unread count.
CREATE INDEX IF NOT EXISTS idx_cp_user_status_conversation ON conversation_participants(user_id, status, conversation_id);
CREATE INDEX IF NOT EXISTS idx_cp_conversation_status_user ON conversation_participants(conversation_id, status, user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created_id ON messages(conversation_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_sender_created ON messages(conversation_id, sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_user ON message_reactions(message_id, user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_emoji ON message_reactions(message_id, emoji);

-- Feed/posts: public list filters should use status + filter + newest order.
CREATE INDEX IF NOT EXISTS idx_posts_status_created_id ON posts(status, created_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_posts_status_major_created ON posts(status, major_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status_topic_created ON posts(status, topic, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts(author_id, created_at DESC);

-- Comments/replies: all comment endpoints are paged.
CREATE INDEX IF NOT EXISTS idx_comments_post_parent_created ON comments(post_id, parent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent_created ON comments(parent_id, created_at ASC);

-- Saved posts no longer load all IDs before pagination.
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_saved_post ON saved_posts(user_id, saved_at DESC, post_id);

-- Notification bulk read/delete and unread count.
CREATE INDEX IF NOT EXISTS idx_notification_user_read_created_id ON notification(user_id, is_read, created_at DESC, id);

-- User social graph pages and blocks.
CREATE INDEX IF NOT EXISTS idx_follows_followee_followed_follower ON follows(followee_id, followed_at DESC, follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_followed_followee ON follows(follower_id, followed_at DESC, followee_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_created_blocked ON blocks(blocker_id, created_at DESC, blocked_id);

-- Admin/auth lookup and permission checks.
CREATE INDEX IF NOT EXISTS idx_users_active_role_created ON users(is_active, role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_provider_verified ON users(auth_provider, email_verified);
CREATE INDEX IF NOT EXISTS idx_bans_active_end_user ON bans(is_active, end_at, user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status_created_id ON reports(status, created_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_id ON admin_actions(created_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_code ON role_permissions(role_name, permission_code);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_code ON user_permissions(user_id, permission_code);

-- OTP/token cleanup and verification.
CREATE INDEX IF NOT EXISTS idx_evt_email_used_created ON email_verification_tokens(email, used, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evt_token_used_expires ON email_verification_tokens(token, used, expires_at);
CREATE INDEX IF NOT EXISTS idx_prt_email_used_created ON password_reset_tokens(email, used, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prt_token_used_expires ON password_reset_tokens(token, used, expires_at);
