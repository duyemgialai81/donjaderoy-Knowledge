package com.example.server.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class LeaderboardDTO {
    private Integer rank;
    private String userId;
    private String userName;
    private String userAvatar;
    private String userEmail;
    private String userRole;
    private Integer points;
    private Integer postsThisWeek;
    private String badgeName;
    private String badgeIcon;
    private String badgeColor;
    private String badgeDescription;
}
