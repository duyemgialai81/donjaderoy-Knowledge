package com.example.server.service;

import com.example.server.model.dto.AuthDTO;
import com.example.server.model.dto.RegisterDTO;
import com.example.server.model.response.ResponseObject;

public interface AuthService {
    ResponseObject login(AuthDTO authDTO);
    ResponseObject register(RegisterDTO registerDTO);
    ResponseObject logout(String userId, String token);
}
