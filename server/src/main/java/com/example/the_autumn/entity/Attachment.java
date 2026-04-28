package com.example.the_autumn.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "attachments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attachment {
    @Id
    private String id;
    private String postId;
    private String name;
    private String type;
    private String size;
    private String url;
    private LocalDateTime createdAt;
}
