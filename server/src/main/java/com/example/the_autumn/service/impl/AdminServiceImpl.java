package com.example.the_autumn.service.impl;

import com.example.the_autumn.entity.AdminAction;
import com.example.the_autumn.entity.Ban;
import com.example.the_autumn.entity.Report;
import com.example.the_autumn.entity.User;
import com.example.the_autumn.model.response.ResponseObject;
import com.example.the_autumn.repository.AdminActionRepository;
import com.example.the_autumn.repository.BanRepository;
import com.example.the_autumn.repository.ReportRepository;
import com.example.the_autumn.repository.UserRepository;
import com.example.the_autumn.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AdminServiceImpl implements AdminService {

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private AdminActionRepository adminActionRepository;

    @Autowired
    private BanRepository banRepository;

    @Autowired
    private UserRepository userRepository;

    @Override
    public ResponseObject listReports(String status) {
        Report.Status st = status == null ? Report.Status.pending : Report.Status.valueOf(status);
        List<Report> rs = reportRepository.findByStatus(st);
        return ResponseObject.success(rs, "OK");
    }

    @Override
    public ResponseObject resolveReport(String reportId, String adminId, String actionTaken) {
        Optional<Report> r = reportRepository.findById(reportId);
        if (r.isEmpty()) return ResponseObject.error("Report not found");

        Report rep = r.get();
        rep.setStatus(Report.Status.resolved);
        rep.setHandledBy(adminId);
        rep.setHandledAt(LocalDateTime.now());
        reportRepository.save(rep);

        AdminAction action = AdminAction.builder()
                .id(UUID.randomUUID().toString())
                .adminId(adminId)
                .action("resolve_report")
                .targetType("report")
                .targetId(reportId)
                .reason(actionTaken)
                .metadata(null)
                .createdAt(LocalDateTime.now())
                .build();
        adminActionRepository.save(action);

        return ResponseObject.success(rep, "Report resolved");
    }

    @Override
    public ResponseObject banUser(String userId, String adminId, String reason, Integer days) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isEmpty()) return ResponseObject.error("User not found");

        LocalDateTime endAt = null;
        if (days != null) {
            endAt = LocalDateTime.now().plusDays(days);
        }

        Ban ban = Ban.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .bannedBy(adminId)
                .reason(reason)
                .startAt(LocalDateTime.now())
                .endAt(endAt)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build();
        banRepository.save(ban);

        // Mark user inactive
        User u = user.get();
        u.setIsActive(false);
        userRepository.save(u);

        AdminAction action = AdminAction.builder()
                .id(UUID.randomUUID().toString())
                .adminId(adminId)
                .action("ban_user")
                .targetType("user")
                .targetId(userId)
                .reason(reason)
                .metadata(null)
                .createdAt(LocalDateTime.now())
                .build();
        adminActionRepository.save(action);

        return ResponseObject.success(ban, "User banned");
    }
}
