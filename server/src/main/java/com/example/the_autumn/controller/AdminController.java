package com.example.the_autumn.controller;

import com.example.the_autumn.model.response.ResponseObject;
import com.example.the_autumn.service.AdminService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @GetMapping("/reports")
    public ResponseObject listReports(@RequestParam(required = false) String status) {
        return adminService.listReports(status);
    }

    @PostMapping("/reports/{id}/resolve")
    public ResponseObject resolveReport(@PathVariable String id, @RequestParam String actionTaken, HttpServletRequest req){
        // Admin check
        var user = (com.example.the_autumn.entity.User) req.getAttribute("CURRENT_USER");
        if (user == null || !user.getRole().name().equals("admin")) return ResponseObject.error("Not authorized");
        return adminService.resolveReport(id, user.getId(), actionTaken);
    }

    @PostMapping("/ban")
    public ResponseObject banUser(@RequestParam String userId, @RequestParam Integer days, @RequestParam(required = false) String reason, HttpServletRequest req) {
        var user = (com.example.the_autumn.entity.User) req.getAttribute("CURRENT_USER");
        if (user == null || !user.getRole().name().equals("admin")) return ResponseObject.error("Not authorized");
        return adminService.banUser(userId, user.getId(), reason, days);
    }
}
