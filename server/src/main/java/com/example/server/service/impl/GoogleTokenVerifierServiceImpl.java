package com.example.server.service.impl;

import com.example.server.config.GoogleOAuthProperties;
import com.example.server.service.GoogleTokenVerifierService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GoogleTokenVerifierServiceImpl implements GoogleTokenVerifierService {
    private static final List<String> ALLOWED_ISSUERS = List.of("https://accounts.google.com", "accounts.google.com");

    private final GoogleOAuthProperties googleOAuthProperties;
    private JwtDecoder jwtDecoder;

    @Override
    public GoogleUserProfile verify(String idToken) {
        if (googleOAuthProperties.getClientId() == null || googleOAuthProperties.getClientId().isBlank()) {
            throw new IllegalArgumentException("Google OAuth client id is not configured");
        }
        Jwt jwt = getJwtDecoder().decode(idToken);
        String issuer = jwt.getIssuer() != null ? jwt.getIssuer().toString() : null;
        if (issuer == null || !ALLOWED_ISSUERS.contains(issuer)) {
            throw new JwtException("Invalid Google token issuer");
        }
        List<String> audiences = jwt.getAudience();
        if (audiences == null || !audiences.contains(googleOAuthProperties.getClientId())) {
            throw new JwtException("Google token audience mismatch");
        }
        String email = jwt.getClaimAsString("email");
        Boolean emailVerified = jwt.getClaimAsBoolean("email_verified");
        if (email == null || !Boolean.TRUE.equals(emailVerified)) {
            throw new JwtException("Google account email is not verified");
        }
        return new GoogleUserProfile(
                jwt.getSubject(),
                email,
                jwt.getClaimAsString("name"),
                jwt.getClaimAsString("picture")
        );
    }

    private JwtDecoder getJwtDecoder() {
        if (jwtDecoder == null) {
            jwtDecoder = NimbusJwtDecoder.withJwkSetUri(googleOAuthProperties.getJwkSetUri()).build();
        }
        return jwtDecoder;
    }
}
