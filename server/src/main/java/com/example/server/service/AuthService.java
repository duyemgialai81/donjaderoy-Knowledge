package com.example.server.service;

import com.example.server.model.dto.*;
import com.example.server.model.response.ResponseObject;

public interface AuthService {
    ResponseObject login(AuthDTO authDTO);
    ResponseObject register(RegisterDTO registerDTO);
    ResponseObject requestRegisterOtp(RegisterDTO registerDTO);
    ResponseObject loginWithGoogle(GoogleLoginDTO googleLoginDTO);
    ResponseObject requestPasswordReset(ForgotPasswordRequestDTO requestDTO);
    ResponseObject resetPassword(ResetPasswordDTO resetPasswordDTO);
    ResponseObject logout(String userId, String token);
}
