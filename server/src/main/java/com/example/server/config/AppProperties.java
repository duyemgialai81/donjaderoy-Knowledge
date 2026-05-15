package com.example.server.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app")
@Data
public class AppProperties {
    private final Otp otp = new Otp();
    private final Mail mail = new Mail();
    @Data
    public static class Otp {
        private long registerExpirationMinutes = 10;
        private long resetExpirationMinutes = 10;
    }
    @Data
    public static class Mail {
        private String from;
    }
}
