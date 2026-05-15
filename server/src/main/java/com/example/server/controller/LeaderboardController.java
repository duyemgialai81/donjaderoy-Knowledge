package com.example.server.controller;

import com.example.server.model.response.ResponseObject;
import com.example.server.service.LeaderboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    @Autowired
    private LeaderboardService leaderboardService;

    @GetMapping("/top")
    public ResponseObject getTopUsers(
            @RequestParam(defaultValue = "10") int limit) {
        return leaderboardService.getTopUsers(limit);
    }

    @GetMapping("/user/{userId}")
    public ResponseObject getUserRank(@PathVariable String userId) {
        return leaderboardService.getUserRank(userId);
    }

    @PostMapping("/update")
    public ResponseObject updateLeaderboard() {
        return leaderboardService.updateLeaderboard();
    }

    @GetMapping("/major/{majorId}")
    public ResponseObject getLeaderboardByMajor(
            @PathVariable String majorId,
            @RequestParam(defaultValue = "10") int limit) {
        return leaderboardService.getLeaderboardByMajor(majorId, limit);
    }

    @GetMapping("/top-posters-week")
    public ResponseObject getTopPostersThisWeek(
            @RequestParam(defaultValue = "10") int limit) {
        return leaderboardService.getTopPostersThisWeek(limit);
    }
}