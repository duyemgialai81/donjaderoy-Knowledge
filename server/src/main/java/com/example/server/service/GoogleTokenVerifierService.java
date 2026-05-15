package com.example.server.service;

public interface GoogleTokenVerifierService {
    GoogleUserProfile verify(String idToken);
    record GoogleUserProfile(String subject, String email, String name, String picture) {
    }
}
