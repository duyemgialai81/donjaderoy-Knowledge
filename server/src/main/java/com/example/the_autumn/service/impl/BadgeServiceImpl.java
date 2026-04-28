package com.example.the_autumn.service.impl;

import com.example.the_autumn.entity.Badge;
import com.example.the_autumn.entity.UserBadge;
import com.example.the_autumn.model.dto.BadgeProgressDTO;
import com.example.the_autumn.model.dto.BadgeWithDateDTO;
import com.example.the_autumn.model.response.ResponseObject;
import com.example.the_autumn.repository.BadgeRepository;
import com.example.the_autumn.repository.UserBadgeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BadgeServiceImpl {

    @Autowired
    private BadgeRepository badgeRepository;

    @Autowired
    private UserBadgeRepository userBadgeRepository;

    public ResponseObject getAllBadges() {
        // Get all badges sorted by required points ascending
        List<Badge> badges = badgeRepository.findAll();
        // Sort manually if repository method doesn't work
        badges.sort((b1, b2) -> {
            int p1 = b1.getRequiredPoints() != null ? b1.getRequiredPoints() : 0;
            int p2 = b2.getRequiredPoints() != null ? b2.getRequiredPoints() : 0;
            return Integer.compare(p1, p2);
        });
        return ResponseObject.success(badges, "OK");
    }


    public ResponseObject getBadgeById(String id) {
        Optional<Badge> badge = badgeRepository.findById(id);
        if (badge.isEmpty()) {
            return ResponseObject.error("Không tìm thấy huy hiệu");
        }
        return ResponseObject.success(badge.get(), "OK");
    }


    public ResponseObject getUserBadges(String userId) {
        List<UserBadge> userBadges = userBadgeRepository.findByUserId(userId);

        List<BadgeWithDateDTO> result = userBadges.stream()
                .map(ub -> {
                    Optional<Badge> badge = badgeRepository.findById(ub.getBadgeId());
                    if (badge.isPresent()) {
                        return new BadgeWithDateDTO(badge.get(), ub.getAwardedAt());
                    }
                    return null;
                })
                .filter(b -> b != null)
                .collect(Collectors.toList());

        return ResponseObject.success(result, "OK");
    }

    @Transactional
    public ResponseObject createBadge(Badge badge) {
        if (badge.getId() == null || badge.getId().isEmpty()) {
            badge.setId(UUID.randomUUID().toString());
        }
        badge.setCreatedAt(LocalDateTime.now());

        // Validate required fields
        if (badge.getName() == null || badge.getName().isEmpty()) {
            return ResponseObject.error("Tên huy hiệu không được để trống");
        }
        if (badge.getRequiredPoints() == null) {
            badge.setRequiredPoints(0);
        }

        Badge saved = badgeRepository.save(badge);
        return ResponseObject.success(saved, "Đã tạo huy hiệu");
    }

    @Transactional
    public ResponseObject updateBadge(String id, Badge badge) {
        Optional<Badge> existing = badgeRepository.findById(id);
        if (existing.isEmpty()) {
            return ResponseObject.error("Không tìm thấy huy hiệu");
        }

        Badge b = existing.get();
        if (badge.getName() != null) b.setName(badge.getName());
        if (badge.getIcon() != null) b.setIcon(badge.getIcon());
        if (badge.getDescription() != null) b.setDescription(badge.getDescription());
        if (badge.getRequiredPoints() != null) b.setRequiredPoints(badge.getRequiredPoints());
        if (badge.getColor() != null) b.setColor(badge.getColor());

        badgeRepository.save(b);
        return ResponseObject.success(b, "Đã cập nhật huy hiệu");
    }

    @Transactional
    public ResponseObject deleteBadge(String id) {
        Optional<Badge> badge = badgeRepository.findById(id);
        if (badge.isEmpty()) {
            return ResponseObject.error("Không tìm thấy huy hiệu");
        }

        badgeRepository.delete(badge.get());
        return ResponseObject.success(null, "Đã xóa huy hiệu");
    }


    public ResponseObject getBadgeProgress(String userId) {
        // Get user's current badges
        List<String> userBadgeIds = userBadgeRepository.findByUserId(userId)
                .stream()
                .map(UserBadge::getBadgeId)
                .collect(Collectors.toList());

        // Get all badges
        List<Badge> allBadges = badgeRepository.findAll();

        // Sort by required points
        allBadges.sort((b1, b2) -> {
            int p1 = b1.getRequiredPoints() != null ? b1.getRequiredPoints() : 0;
            int p2 = b2.getRequiredPoints() != null ? b2.getRequiredPoints() : 0;
            return Integer.compare(p1, p2);
        });

        // Build progress list
        List<BadgeProgressDTO> progress = allBadges.stream()
                .map(badge -> {
                    boolean achieved = userBadgeIds.contains(badge.getId());
                    return new BadgeProgressDTO(badge, achieved);
                })
                .collect(Collectors.toList());

        return ResponseObject.success(progress, "OK");
    }
}
