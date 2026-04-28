package com.example.the_autumn.config;

import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "jwt")
@Data
public class JwtConfig {

    // [FIX]: Sử dụng @Value để đảm bảo Secret Key được tiêm chính xác từ file properties
    // Thiết lập giá trị mặc định an toàn nếu không tìm thấy trong properties
    @Value("${jwt.secret:default-secret-for-jwt-fallback-32-byte}")
    private String secret;

    // 1 ngày (mili giây)
    private long expiration = 86400000;

    // 7 ngày (mili giây)
    private long refreshExpiration = 604800000;

    private String issuer = "the-autumn-api";
}