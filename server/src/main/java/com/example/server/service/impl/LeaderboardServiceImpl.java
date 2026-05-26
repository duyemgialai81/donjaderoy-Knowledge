package com.example.server.service.impl;

import com.example.server.entity.Badge;
import com.example.server.entity.Leaderboard;
import com.example.server.entity.Post;
import com.example.server.entity.User;
import com.example.server.model.dto.LeaderboardDTO;
import com.example.server.model.response.ResponseObject;
import com.example.server.repository.BadgeRepository;
import com.example.server.repository.LeaderboardRepository;
import com.example.server.repository.PostRepository;
import com.example.server.repository.UserRepository;
import com.example.server.service.LeaderboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class LeaderboardServiceImpl implements LeaderboardService {
    private static final int MAX_LIMIT = 100;
    private static final int MAX_REFRESH_USERS = 5000;

    @Autowired
    private LeaderboardRepository leaderboardRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private BadgeRepository badgeRepository;

    @Override
    public ResponseObject getTopUsers(int limit) {
        List<User> topUsers = userRepository
                .findAllByOrderByPointsDesc(PageRequest.of(0, normalizeLimit(limit)))
                .getContent();
        List<Badge> badges = badgeRepository.findAllByOrderByRequiredPointsDesc();

        List<LeaderboardDTO> result = new ArrayList<>();
        for (int i = 0; i < topUsers.size(); i++) {
            result.add(convertUserToDTO(topUsers.get(i), i + 1, 0, badges));
        }
        return ResponseObject.success(result, "OK");
    }

    @Override
    @Transactional(readOnly = true)
    public ResponseObject getUserRank(String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseObject.error("Nguoi dung khong ton tai");
        }

        User user = userOpt.get();
        int points = user.getPoints() != null ? user.getPoints() : 0;
        int rank = (int) Math.min(Integer.MAX_VALUE, userRepository.countByPointsGreaterThan(points) + 1);
        LocalDateTime weekAgo = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minus(7, ChronoUnit.DAYS);
        int postsThisWeek = postRepository.countByAuthorIdAndStatusAndCreatedAtAfter(
                user.getId(),
                Post.Status.published,
                weekAgo
        );

        LeaderboardDTO dto = convertUserToDTO(
                user,
                rank,
                postsThisWeek,
                badgeRepository.findAllByOrderByRequiredPointsDesc()
        );
        return ResponseObject.success(dto, "OK");
    }

    @Override
    @Transactional
    public ResponseObject updateLeaderboard() {
        List<User> users = userRepository
                .findAllByOrderByPointsDesc(PageRequest.of(0, MAX_REFRESH_USERS))
                .getContent();
        List<Badge> badges = badgeRepository.findAllByOrderByRequiredPointsDesc();
        LocalDateTime weekAgo = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minus(7, ChronoUnit.DAYS);

        int rank = 1;
        for (User user : users) {
            int postsThisWeek = postRepository.countByAuthorIdAndStatusAndCreatedAtAfter(
                    user.getId(),
                    Post.Status.published,
                    weekAgo
            );
            Badge badge = determineBadge(user.getPoints(), badges);
            Leaderboard row = findPrimaryLeaderboard(user.getId()).orElseGet(Leaderboard::new);
            row.setUserId(user.getId());
            row.setRankNo(rank++);
            row.setPoints(user.getPoints() != null ? user.getPoints() : 0);
            row.setPostsThisWeek(postsThisWeek);
            row.setBadgeId(badge != null ? badge.getId() : null);
            leaderboardRepository.save(row);
        }

        return ResponseObject.success(null, "Da cap nhat top " + users.size() + " nguoi dung");
    }

    @Override
    public ResponseObject getLeaderboardByMajor(String majorId, int limit) {
        List<User> users = userRepository
                .findByMajorIdOrderByPointsDesc(majorId, PageRequest.of(0, normalizeLimit(limit)))
                .getContent();
        List<Badge> badges = badgeRepository.findAllByOrderByRequiredPointsDesc();

        List<LeaderboardDTO> result = new ArrayList<>();
        for (int i = 0; i < users.size(); i++) {
            result.add(convertUserToDTO(users.get(i), i + 1, 0, badges));
        }
        return ResponseObject.success(result, "OK");
    }

    @Override
    public ResponseObject getTopPostersThisWeek(int limit) {
        List<Leaderboard> topPosters = leaderboardRepository
                .findAllByOrderByPostsThisWeekDesc(PageRequest.of(0, normalizeLimit(limit)))
                .getContent();
        return ResponseObject.success(convertLeaderboardRows(topPosters), "OK");
    }

    @Transactional
    public void recalculateRanks() {
        List<User> topUsers = userRepository
                .findAllByOrderByPointsDesc(PageRequest.of(0, MAX_REFRESH_USERS))
                .getContent();
        int rank = 1;
        for (User user : topUsers) {
            Leaderboard row = findPrimaryLeaderboard(user.getId()).orElseGet(Leaderboard::new);
            row.setUserId(user.getId());
            row.setRankNo(rank++);
            row.setPoints(user.getPoints() != null ? user.getPoints() : 0);
            leaderboardRepository.save(row);
        }
    }

    private List<LeaderboardDTO> convertLeaderboardRows(List<Leaderboard> rows) {
        if (rows == null || rows.isEmpty()) {
            return List.of();
        }

        Set<String> userIds = new LinkedHashSet<>();
        Set<String> badgeIds = new LinkedHashSet<>();
        for (Leaderboard row : rows) {
            if (row.getUserId() != null) {
                userIds.add(row.getUserId());
            }
            if (row.getBadgeId() != null) {
                badgeIds.add(row.getBadgeId());
            }
        }

        Map<String, User> usersById = new HashMap<>();
        userRepository.findAllById(userIds).forEach(user -> usersById.put(user.getId(), user));

        Map<String, Badge> badgesById = new HashMap<>();
        badgeRepository.findAllById(badgeIds).forEach(badge -> badgesById.put(badge.getId(), badge));

        List<LeaderboardDTO> result = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            Leaderboard row = rows.get(i);
            LeaderboardDTO dto = new LeaderboardDTO();
            dto.setRank(row.getRankNo() != null ? row.getRankNo() : i + 1);
            dto.setUserId(row.getUserId());
            dto.setPoints(row.getPoints() != null ? row.getPoints() : 0);
            dto.setPostsThisWeek(row.getPostsThisWeek() != null ? row.getPostsThisWeek() : 0);

            User user = usersById.get(row.getUserId());
            if (user != null) {
                dto.setUserName(user.getName());
                dto.setUserAvatar(user.getAvatar());
                dto.setUserEmail(user.getEmail());
                dto.setUserRole(user.getRole() != null ? user.getRole().name() : null);
            }

            Badge badge = badgesById.get(row.getBadgeId());
            if (badge != null) {
                fillBadge(dto, badge);
            }
            result.add(dto);
        }
        return result;
    }

    private LeaderboardDTO convertUserToDTO(User user, Integer rank, Integer postsThisWeek, List<Badge> badges) {
        LeaderboardDTO dto = new LeaderboardDTO();
        dto.setRank(rank);
        dto.setUserId(user.getId());
        dto.setUserName(user.getName());
        dto.setUserAvatar(user.getAvatar());
        dto.setUserEmail(user.getEmail());
        dto.setUserRole(user.getRole() != null ? user.getRole().name() : null);
        dto.setPoints(user.getPoints() != null ? user.getPoints() : 0);
        dto.setPostsThisWeek(postsThisWeek != null ? postsThisWeek : 0);

        Badge badge = determineBadge(user.getPoints(), badges);
        if (badge != null) {
            fillBadge(dto, badge);
        }
        return dto;
    }

    private void fillBadge(LeaderboardDTO dto, Badge badge) {
        dto.setBadgeName(badge.getName());
        dto.setBadgeIcon(badge.getIcon());
        dto.setBadgeColor(badge.getColor());
        dto.setBadgeDescription(badge.getDescription());
    }

    private Badge determineBadge(Integer points, List<Badge> badges) {
        if (points == null || points == 0 || badges == null) {
            return null;
        }
        for (Badge badge : badges) {
            if (points >= badge.getRequiredPoints()) {
                return badge;
            }
        }
        return null;
    }

    private int normalizeLimit(int limit) {
        if (limit <= 0) {
            return 10;
        }
        return Math.min(limit, MAX_LIMIT);
    }

    private Optional<Leaderboard> findPrimaryLeaderboard(String userId) {
        List<Leaderboard> rows = leaderboardRepository.findAllByUserIdOrderByIdAsc(userId);
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        if (rows.size() > 1) {
            leaderboardRepository.deleteAll(rows.subList(1, rows.size()));
        }
        return Optional.of(rows.get(0));
    }
}
