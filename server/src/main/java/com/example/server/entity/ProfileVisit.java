package com.example.server.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "profile_visits",
        indexes = {
                @Index(name = "idx_profile_visits_profile_time", columnList = "profile_user_id,visited_at"),
                @Index(name = "idx_profile_visits_visitor", columnList = "visitor_user_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProfileVisit {
    @Id
    private String id;

    @Column(name = "profile_user_id", nullable = false)
    private String profileUserId;

    @Column(name = "visitor_user_id", nullable = false)
    private String visitorUserId;

    @Column(name = "visited_at", nullable = false)
    private LocalDateTime visitedAt;
}
