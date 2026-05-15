package com.example.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "follows")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(FollowId.class)
public class Follow {

    @Id
    private String followerId;

    @Id
    private String followeeId;

    private LocalDateTime followedAt;
}
