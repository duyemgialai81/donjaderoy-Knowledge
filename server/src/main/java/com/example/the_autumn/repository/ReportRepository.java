package com.example.the_autumn.repository;

import com.example.the_autumn.entity.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, String> {
    List<Report> findByStatus(Report.Status status);
    Page<Report> findByStatus(Report.Status status, Pageable pageable);
    List<Report> findByPostId(String postId);
    Page<Report> findByReportedBy(String reportedBy, Pageable pageable);
    boolean existsByPostIdAndReportedBy(String postId, String reportedBy);
    int countByStatus(Report.Status status);

}
