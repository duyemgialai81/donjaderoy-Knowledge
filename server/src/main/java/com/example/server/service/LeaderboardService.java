package com.example.server.service;

import com.example.server.model.response.ResponseObject;

public interface LeaderboardService {
    ResponseObject getTopUsers(int limit);
    ResponseObject getUserRank(String userId);
    ResponseObject updateLeaderboard();
    ResponseObject getLeaderboardByMajor(String majorId, int limit);
    ResponseObject getTopPostersThisWeek(int limit);
}