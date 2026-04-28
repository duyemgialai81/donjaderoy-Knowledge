package com.example.the_autumn.controller;

import com.example.the_autumn.entity.Session;
import com.example.the_autumn.entity.User;
import com.example.the_autumn.model.response.ResponseObject;
import com.example.the_autumn.repository.SessionRepository;
import com.example.the_autumn.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("")
    public ResponseObject listMySessions(HttpServletRequest request) {
        User current = (User) request.getAttribute("CURRENT_USER");
        if (current == null) return ResponseObject.error("Unauthorized");
        List<Session> sessions = sessionRepository.findByUserId(current.getId());
        return ResponseObject.success(sessions, "OK");
    }

    @PostMapping("/{token}/revoke")
    public ResponseObject revokeSession(@PathVariable String token, HttpServletRequest request) {
        User current = (User) request.getAttribute("CURRENT_USER");
        if (current == null) return ResponseObject.error("Unauthorized");
        Optional<Session> maybe = sessionRepository.findByToken(token);
        if (maybe.isEmpty()) return ResponseObject.error("Session not found");
        Session session = maybe.get();
        if (!session.getUserId().equals(current.getId()) && current.getRole() != User.Role.admin) return ResponseObject.error("Forbidden");
        session.setIsActive(false);
        session.setLogoutAt(LocalDateTime.now());
        sessionRepository.save(session);
        return ResponseObject.success(null, "Revoked");
    }
}
