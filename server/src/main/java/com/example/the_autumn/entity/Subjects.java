    package com.example.the_autumn.entity;
    
    import jakarta.persistence.*;
    import lombok.*;
    
    import java.time.LocalDate;
    
    @Entity
    @Table(name = "subjects")
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public class Subjects {
        @Id
        private String id;
        private String name;
        private String code;
        private Integer credits;
        private Integer semester;
        @Column(name = "created_at")
        private LocalDate  createdAt;
        @ManyToOne
        @JoinColumn(name = "major_id", referencedColumnName = "id")
        private Major major;
    }
