package com.example.the_autumn.service;


import com.example.the_autumn.model.dto.ReportDTO;
import com.example.the_autumn.model.response.ResponseObject;

public interface ReportService {
    ResponseObject createReport(ReportDTO dto);
    ResponseObject getReportById(String id);
    ResponseObject getReportsByStatus(String status, int page, int size);
    ResponseObject getReportsByPost(String postId);
    ResponseObject getReportsByUser(String userId, int page, int size);
    ResponseObject updateReportStatus(String reportId, String status, String handledBy);
    ResponseObject deleteReport(String reportId);
    ResponseObject getReportStats();
}