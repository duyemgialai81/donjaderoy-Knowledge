package com.example.the_autumn.service;

import com.example.the_autumn.model.dto.AuthDTO;
import com.example.the_autumn.model.dto.RegisterDTO;
import com.example.the_autumn.model.response.ResponseObject;

public interface AuthService {
    ResponseObject login(AuthDTO authDTO);
    ResponseObject register(RegisterDTO registerDTO);
    ResponseObject logout(String userId, String token);
}
