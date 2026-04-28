package com.example.the_autumn.controller;

import com.example.the_autumn.model.dto.ReportDTO;
import com.example.the_autumn.model.response.ResponseObject;
import com.example.the_autumn.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired
    private ReportService reportService;

    @PostMapping
    public ResponseObject createReport(@RequestBody ReportDTO dto) {
        return reportService.createReport(dto);
    }

    @GetMapping("/{id}")
    public ResponseObject getReportById(@PathVariable String id) {
        return reportService.getReportById(id);
    }

    @GetMapping("/status/{status}")
    public ResponseObject getReportsByStatus(
            @PathVariable String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return reportService.getReportsByStatus(status, page, size);
    }

    @GetMapping("/post/{postId}")
    public ResponseObject getReportsByPost(@PathVariable String postId) {
        return reportService.getReportsByPost(postId);
    }

    @GetMapping("/user/{userId}")
    public ResponseObject getReportsByUser(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return reportService.getReportsByUser(userId, page, size);
    }

    @PutMapping("/{reportId}/status")
    public ResponseObject updateReportStatus(
            @PathVariable String reportId,
            @RequestParam String status,
            @RequestParam String handledBy) {
        return reportService.updateReportStatus(reportId, status, handledBy);
    }

    @DeleteMapping("/{reportId}")
    public ResponseObject deleteReport(@PathVariable String reportId) {
        return reportService.deleteReport(reportId);
    }

    @GetMapping("/stats")
    public ResponseObject getReportStats() {
        return reportService.getReportStats();
    }
}