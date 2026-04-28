package com.example.the_autumn.service;

import com.example.the_autumn.model.response.ResponseObject;

public interface LeaderboardService {
    ResponseObject getTopUsers(int limit);
    ResponseObject getUserRank(String userId);
    ResponseObject updateLeaderboard();
    ResponseObject getLeaderboardByMajor(String majorId, int limit);
    ResponseObject getTopPostersThisWeek(int limit);
}