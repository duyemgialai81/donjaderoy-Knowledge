package com.example.server.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "google.oauth")
@Data
public class GoogleOAuthProperties {
    private String clientId;
    private String jwkSetUri;
}
