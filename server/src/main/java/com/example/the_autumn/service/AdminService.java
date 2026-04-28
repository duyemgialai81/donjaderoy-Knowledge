package com.example.the_autumn.service;

import com.example.the_autumn.entity.Report;
import com.example.the_autumn.model.response.ResponseObject;

import java.util.List;

public interface AdminService {
    ResponseObject listReports(String status);
    ResponseObject resolveReport(String reportId, String adminId, String actionTaken);
    ResponseObject banUser(String userId, String adminId, String reason, Integer days);
}
