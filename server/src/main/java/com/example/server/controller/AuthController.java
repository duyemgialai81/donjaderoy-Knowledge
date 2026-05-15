package com.example.server.controller;

import com.example.server.model.dto.*;
import com.example.server.model.response.ResponseObject;
import com.example.server.service.AuthService;
import com.example.server.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin("*")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserService userService;

    @PostMapping("/login")
    public ResponseObject login(@RequestBody AuthDTO dto) {
        return authService.login(dto);
    }

    @PostMapping("/register")
    public ResponseObject register(@RequestBody RegisterDTO dto) {
        return authService.register(dto);
    }

    @PostMapping("/register/request-otp")
    public ResponseObject requestRegisterOtp(@RequestBody RegisterDTO dto) {
        return authService.requestRegisterOtp(dto);
    }

    @PostMapping("/google/login")
    public ResponseObject googleLogin(@RequestBody GoogleLoginDTO dto) {
        return authService.loginWithGoogle(dto);
    }

    @PostMapping("/forgot-password/request-otp")
    public ResponseObject forgotPassword(@RequestBody ForgotPasswordRequestDTO dto) {
        return authService.requestPasswordReset(dto);
    }

    @PostMapping("/forgot-password/reset")
    public ResponseObject resetPassword(@RequestBody ResetPasswordDTO dto) {
        return authService.resetPassword(dto);
    }

    @PostMapping("/logout")
    public ResponseObject logout(@RequestParam String userId, @RequestParam String token) {
        return authService.logout(userId, token);
    }

    @GetMapping("/me")
    public ResponseObject me(Principal principal) {
        if (principal == null) {
            return ResponseObject.error("Not authenticated");
        }
        return userService.getUserProfile(principal.getName());
    }
}
