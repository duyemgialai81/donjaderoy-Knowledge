package com.example.server.service;

import com.example.server.model.response.ResponseObject;

public interface AdminService {
    ResponseObject listReports(String status);
    ResponseObject resolveReport(String reportId, String adminId, String actionTaken);
    ResponseObject banUser(String userId, String adminId, String reason, Integer days);
}
