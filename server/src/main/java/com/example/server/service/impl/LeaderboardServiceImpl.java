package com.example.server.service.impl;

import com.example.server.entity.Badge;
import com.example.server.entity.Leaderboard;
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
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class LeaderboardServiceImpl implements LeaderboardService {
    private static final int MAX_LIMIT = 100;

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
        List<Leaderboard> topUsers = leaderboardRepository
                .findAllByOrderByPointsDesc(PageRequest.of(0, normalizeLimit(limit)))
                .getContent();

        List<LeaderboardDTO> result = topUsers.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return ResponseObject.success(result, "OK");
    }

    @Override
    public ResponseObject getUserRank(String userId) {
        Optional<Leaderboard> leaderboard = leaderboardRepository.findByUserId(userId);

        if (leaderboard.isEmpty()) {
            // If user not in leaderboard yet, create entry
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseObject.error("Người dùng không tồn tại");
            }

            User user = userOpt.get();
            Badge badge = determineBadge(user.getPoints());

            Leaderboard lb = Leaderboard.builder()
                    .userId(userId)
                    .points(user.getPoints() != null ? user.getPoints() : 0)
                    .postsThisWeek(0)
                    .badgeId(badge != null ? badge.getId() : null)
                    .build();
            leaderboardRepository.save(lb);

            recalculateRanks();
            leaderboard = leaderboardRepository.findByUserId(userId);
        }

        LeaderboardDTO dto = convertToDTO(leaderboard.get());
        return ResponseObject.success(dto, "OK");
    }

    @Override
    @Transactional
    public ResponseObject updateLeaderboard() {
        // Get all users
        List<User> allUsers = userRepository.findAll();

        LocalDateTime weekAgo = LocalDateTime.now().minus(7, ChronoUnit.DAYS);

        for (User user : allUsers) {
            // Count posts this week
            int postsThisWeek = postRepository.countByAuthorIdAndCreatedAtAfter(
                    user.getId(),
                    weekAgo
            );

            // Find or create leaderboard entry
            Optional<Leaderboard> existing = leaderboardRepository.findByUserId(user.getId());

            if (existing.isPresent()) {
                Leaderboard lb = existing.get();
                lb.setPoints(user.getPoints() != null ? user.getPoints() : 0);
                lb.setPostsThisWeek(postsThisWeek);

                // Assign badge based on points
                Badge badge = determineBadge(user.getPoints());
                lb.setBadgeId(badge != null ? badge.getId() : null);

                leaderboardRepository.save(lb);
            } else {
                Badge badge = determineBadge(user.getPoints());

                Leaderboard lb = Leaderboard.builder()
                        .userId(user.getId())
                        .points(user.getPoints() != null ? user.getPoints() : 0)
                        .postsThisWeek(postsThisWeek)
                        .badgeId(badge != null ? badge.getId() : null)
                        .build();
                leaderboardRepository.save(lb);
            }
        }

        // Recalculate ranks
        recalculateRanks();

        return ResponseObject.success(null, "Đã cập nhật bảng xếp hạng");
    }

    @Override
    public ResponseObject getLeaderboardByMajor(String majorId, int limit) {
        List<Leaderboard> leaderboards = leaderboardRepository
                .findByMajorIdOrderByPointsDesc(majorId, PageRequest.of(0, normalizeLimit(limit)))
                .getContent();

        List<LeaderboardDTO> result = leaderboards.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return ResponseObject.success(result, "OK");
    }

    @Override
    public ResponseObject getTopPostersThisWeek(int limit) {
        List<Leaderboard> topPosters = leaderboardRepository
                .findAllByOrderByPostsThisWeekDesc(PageRequest.of(0, normalizeLimit(limit)))
                .getContent();

        List<LeaderboardDTO> result = topPosters.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return ResponseObject.success(result, "OK");
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    /**
     * Recalculate all ranks based on points
     */
    @Transactional
    public void recalculateRanks() {
        List<Leaderboard> all = leaderboardRepository.findAllByOrderByPointsDesc();
        int rank = 1;
        for (Leaderboard lb : all) {
            lb.setRankNo(rank++);
            leaderboardRepository.save(lb);
        }
    }

    /**
     * Determine which badge user should have based on points
     */
    private Badge determineBadge(Integer points) {
        if (points == null || points == 0) return null;

        // Get all badges sorted by required points descending
        List<Badge> allBadges = badgeRepository.findAllByOrderByRequiredPointsDesc();

        // Find the highest badge user qualifies for
        for (Badge badge : allBadges) {
            if (points >= badge.getRequiredPoints()) {
                return badge;
            }
        }

        return null;
    }

    /**
     * Convert Leaderboard entity to DTO with user and badge info
     */
    private LeaderboardDTO convertToDTO(Leaderboard lb) {
        LeaderboardDTO dto = new LeaderboardDTO();
        dto.setRank(lb.getRankNo());
        dto.setUserId(lb.getUserId());
        dto.setPoints(lb.getPoints());
        dto.setPostsThisWeek(lb.getPostsThisWeek());

        // Get user info
        userRepository.findById(lb.getUserId()).ifPresent(user -> {
            dto.setUserName(user.getName());
            dto.setUserAvatar(user.getAvatar());
            dto.setUserEmail(user.getEmail());
            dto.setUserRole(user.getRole().name());
        });

        // Get badge info
        if (lb.getBadgeId() != null) {
            badgeRepository.findById(lb.getBadgeId()).ifPresent(badge -> {
                dto.setBadgeName(badge.getName());
                dto.setBadgeIcon(badge.getIcon());
                dto.setBadgeColor(badge.getColor());
                dto.setBadgeDescription(badge.getDescription());
            });
        }

        return dto;
    }

    private int normalizeLimit(int limit) {
        if (limit <= 0) {
            return 10;
        }
        return Math.min(limit, MAX_LIMIT);
    }
}
