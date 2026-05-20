package com.example.server.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseEncodingInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute("ALTER TABLE messages CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            jdbcTemplate.execute("ALTER TABLE messages MODIFY content LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        } catch (Exception e) {
            log.warn("Could not ensure utf8mb4 encoding for messages table. Apply db/tidb-utf8mb4-messages.sql manually if inserts with Vietnamese text still fail.", e);
        }

        try {
            jdbcTemplate.execute("ALTER TABLE message_reactions DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            jdbcTemplate.execute("ALTER TABLE message_reactions MODIFY emoji VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL");
        } catch (Exception e) {
            log.warn("Could not ensure utf8mb4 encoding for message_reactions. Apply db/tidb-utf8mb4-messages.sql manually if emoji reactions still fail.", e);
        }
    }
}
