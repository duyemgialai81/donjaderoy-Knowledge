package com.example.server.controller;

import com.example.server.entity.ProfileVisit;
import com.example.server.entity.User;
import com.example.server.model.response.ResponseObject;
import com.example.server.repository.ProfileVisitRepository;
import com.example.server.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/profile-visits")
public class ProfileVisitController {
    @Autowired
    private ProfileVisitRepository profileVisitRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/{profileUserId}")
    public ResponseObject recordVisit(@PathVariable String profileUserId, Principal principal) {
        if (principal == null) {
            return ResponseObject.error("Unauthorized");
        }

        String visitorUserId = principal.getName();
        if (profileUserId.equals(visitorUserId)) {
            return ResponseObject.success(Map.of("count", profileVisitRepository.countByProfileUserId(profileUserId)), "OK");
        }

        ProfileVisit visit = ProfileVisit.builder()
                .id(UUID.randomUUID().toString())
                .profileUserId(profileUserId)
                .visitorUserId(visitorUserId)
                .visitedAt(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")))
                .build();
        profileVisitRepository.save(visit);

        return ResponseObject.success(Map.of("count", profileVisitRepository.countByProfileUserId(profileUserId)), "OK");
    }

    @GetMapping("/{profileUserId}/count")
    public ResponseObject countVisits(@PathVariable String profileUserId, Principal principal) {
        if (principal == null || !profileUserId.equals(principal.getName())) {
            return ResponseObject.error("Forbidden");
        }
        return ResponseObject.success(Map.of("count", profileVisitRepository.countByProfileUserId(profileUserId)), "OK");
    }

    @GetMapping("/{profileUserId}/recent")
    public ResponseObject recentVisitors(
            @PathVariable String profileUserId,
            @RequestParam(defaultValue = "20") int limit,
            Principal principal) {
        if (principal == null || !profileUserId.equals(principal.getName())) {
            return ResponseObject.error("Forbidden");
        }

        Map<String, Map<String, Object>> grouped = new LinkedHashMap<>();
        for (ProfileVisit visit : profileVisitRepository.findByProfileUserIdOrderByVisitedAtDesc(profileUserId)) {
            Map<String, Object> item = grouped.computeIfAbsent(visit.getVisitorUserId(), id -> {
                Map<String, Object> value = new LinkedHashMap<>();
                value.put("userId", id);
                value.put("visitCount", 0L);
                value.put("lastVisitedAt", visit.getVisitedAt());
                userRepository.findById(id).ifPresent(user -> putUser(value, user));
                return value;
            });
            item.put("visitCount", ((Number) item.get("visitCount")).longValue() + 1L);
        }

        List<Map<String, Object>> visitors = new ArrayList<>(grouped.values());
        visitors.sort(Comparator.comparingLong((Map<String, Object> item) ->
                ((Number) item.get("visitCount")).longValue()
        ).reversed());
        int safeLimit = Math.max(1, Math.min(limit, 50));
        if (visitors.size() > safeLimit) {
            visitors = visitors.subList(0, safeLimit);
        }
        return ResponseObject.success(Map.of(
                "count", profileVisitRepository.countByProfileUserId(profileUserId),
                "visitors", visitors
        ), "OK");
    }

    private void putUser(Map<String, Object> value, User user) {
        value.put("name", user.getName());
        value.put("avatar", user.getAvatar());
        value.put("email", user.getEmail());
        value.put("role", user.getRole() == null ? null : user.getRole().name());
    }
}
