package com.example.the_autumn.controller;

import com.example.the_autumn.entity.Badge;
import com.example.the_autumn.model.response.ResponseObject;
import com.example.the_autumn.service.impl.BadgeServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/badges")
public class BadgeController {
    @Autowired
    private BadgeServiceImpl badgeService;
    @GetMapping
    public ResponseObject getAllBadges() {
        return badgeService.getAllBadges();
    }
    @GetMapping("/{id}")
    public ResponseObject getBadgeById(@PathVariable String id) {
        return badgeService.getBadgeById(id);
    }
    @GetMapping("/user/{userId}")
    public ResponseObject getUserBadges(@PathVariable String userId) {
        return badgeService.getUserBadges(userId);
    }
    @GetMapping("/user/{userId}/progress")
    public ResponseObject getBadgeProgress(@PathVariable String userId) {
        return badgeService.getBadgeProgress(userId);
    }
    @PostMapping
    public ResponseObject createBadge(@RequestBody Badge badge) {
        return badgeService.createBadge(badge);
    }
    @PutMapping("/{id}")
    public ResponseObject updateBadge(
            @PathVariable String id,
            @RequestBody Badge badge) {
        return badgeService.updateBadge(id, badge);
    }
    @DeleteMapping("/{id}")
    public ResponseObject deleteBadge(@PathVariable String id) {
        return badgeService.deleteBadge(id);
    }
}