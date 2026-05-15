package com.example.server.controller;

import com.example.server.model.dto.AuthDTO;
import com.example.server.model.dto.RegisterDTO;
import com.example.server.model.response.ResponseObject;
import com.example.server.service.AuthService;
import com.example.server.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.security.Principal; // SỬ DỤNG JAVA SECURITY PRINCIPAL

@RestController
@RequestMapping("/api/auth")
@CrossOrigin("*")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserService userService;

    @PostMapping("/login")
    public ResponseObject login(@RequestBody AuthDTO dto){
        return authService.login(dto);
    }

    @PostMapping("/register")
    public ResponseObject register(@RequestBody RegisterDTO dto){
        return authService.register(dto);
    }

    @PostMapping("/logout")
    public ResponseObject logout(@RequestParam String userId, @RequestParam String token){
        return authService.logout(userId, token);
    }

    @GetMapping("/me")
    public ResponseObject me(Principal principal){
        if (principal == null) {
            return ResponseObject.error("Not authenticated");
        }

        // Trong JwtTokenIntrospector, chúng ta set user ID làm Principal Name (getName()).
        String userId = principal.getName();

        return userService.getUserProfile(userId);
    }
}