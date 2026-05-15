package com.example.server.service.impl;

import com.example.server.entity.Post;
import com.example.server.entity.Report;

import com.example.server.model.dto.ReportDTO;
import com.example.server.model.response.ResponseObject;
import com.example.server.repository.PostRepository;
import com.example.server.repository.ReportRepository;
import com.example.server.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class ReportServiceImpl implements ReportService {

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private PostRepository postRepository;

    @Override
    @Transactional
    public ResponseObject createReport(ReportDTO dto) {
        // Check if post exists
        Optional<Post> post = postRepository.findById(dto.getPostId());
        if (post.isEmpty()) {
            return ResponseObject.error("Không tìm thấy bài viết");
        }

        // Check if user already reported this post
        if (reportRepository.existsByPostIdAndReportedBy(dto.getPostId(), dto.getReportedBy())) {
            return ResponseObject.error("Bạn đã báo cáo bài viết này rồi");
        }

        Report report = Report.builder()
                .id(UUID.randomUUID().toString())
                .postId(dto.getPostId())
                .reportedBy(dto.getReportedBy())
                .reason(dto.getReason())
                .description(dto.getDescription())
                .status(Report.Status.pending)
                .createdAt(LocalDateTime.now())
                .build();

        reportRepository.save(report);
        return ResponseObject.success(report, "Đã gửi báo cáo");
    }

    @Override
    public ResponseObject getReportById(String id) {
        Optional<Report> report = reportRepository.findById(id);
        if (report.isEmpty()) {
            return ResponseObject.error("Không tìm thấy báo cáo");
        }
        return ResponseObject.success(report.get(), "OK");
    }

    @Override
    public ResponseObject getReportsByStatus(String status, int page, int size) {
        Report.Status statusEnum;
        try {
            statusEnum = Report.Status.valueOf(status);
        } catch (IllegalArgumentException e) {
            return ResponseObject.error("Trạng thái không hợp lệ");
        }

        Page<Report> reports = reportRepository.findByStatus(
                statusEnum,
                PageRequest.of(page, size)
        );

        return ResponseObject.success(
                new com.example.server.model.response.PageableObject<>(reports),
                "OK"
        );
    }

    @Override
    public ResponseObject getReportsByPost(String postId) {
        var reports = reportRepository.findByPostId(postId);
        return ResponseObject.success(reports, "OK");
    }

    @Override
    public ResponseObject getReportsByUser(String userId, int page, int size) {
        Page<Report> reports = reportRepository.findByReportedBy(
                userId,
                PageRequest.of(page, size)
        );

        return ResponseObject.success(
                new com.example.server.model.response.PageableObject<>(reports),
                "OK"
        );
    }

    @Override
    @Transactional
    public ResponseObject updateReportStatus(String reportId, String status, String handledBy) {
        Optional<Report> maybe = reportRepository.findById(reportId);
        if (maybe.isEmpty()) {
            return ResponseObject.error("Không tìm thấy báo cáo");
        }

        Report.Status statusEnum;
        try {
            statusEnum = Report.Status.valueOf(status);
        } catch (IllegalArgumentException e) {
            return ResponseObject.error("Trạng thái không hợp lệ");
        }

        Report report = maybe.get();
        report.setStatus(statusEnum);
        report.setHandledBy(handledBy);
        report.setHandledAt(LocalDateTime.now());

        reportRepository.save(report);
        return ResponseObject.success(report, "Đã cập nhật trạng thái báo cáo");
    }

    @Override
    @Transactional
    public ResponseObject deleteReport(String reportId) {
        Optional<Report> report = reportRepository.findById(reportId);
        if (report.isEmpty()) {
            return ResponseObject.error("Không tìm thấy báo cáo");
        }

        reportRepository.delete(report.get());
        return ResponseObject.success(null, "Đã xóa báo cáo");
    }

    @Override
    public ResponseObject getReportStats() {
        int totalReports = (int) reportRepository.count();
        int pendingReports = reportRepository.countByStatus(Report.Status.pending);
        int reviewedReports = reportRepository.countByStatus(Report.Status.reviewed);
        int resolvedReports = reportRepository.countByStatus(Report.Status.resolved);

        ReportStatsDTO stats = new ReportStatsDTO();
        stats.setTotalReports(totalReports);
        stats.setPendingReports(pendingReports);
        stats.setReviewedReports(reviewedReports);
        stats.setResolvedReports(resolvedReports);

        return ResponseObject.success(stats, "OK");
    }

    // DTO
    public static class ReportStatsDTO {
        private int totalReports;
        private int pendingReports;
        private int reviewedReports;
        private int resolvedReports;

        // Getters and setters
        public int getTotalReports() { return totalReports; }
        public void setTotalReports(int totalReports) { this.totalReports = totalReports; }

        public int getPendingReports() { return pendingReports; }
        public void setPendingReports(int pendingReports) { this.pendingReports = pendingReports; }

        public int getReviewedReports() { return reviewedReports; }
        public void setReviewedReports(int reviewedReports) { this.reviewedReports = reviewedReports; }

        public int getResolvedReports() { return resolvedReports; }
        public void setResolvedReports(int resolvedReports) { this.resolvedReports = resolvedReports; }
    }
}