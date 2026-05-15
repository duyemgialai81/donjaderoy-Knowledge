package com.example.server.controller;

import com.example.server.entity.Device;
import com.example.server.entity.User;
import com.example.server.model.response.ResponseObject;
import com.example.server.repository.DeviceRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    @Autowired
    private DeviceRepository deviceRepository;

    @GetMapping("")
    public ResponseObject listMyDevices(HttpServletRequest request) {
        User current = (User) request.getAttribute("CURRENT_USER");
        if (current == null) return ResponseObject.error("Unauthorized");
        List<Device> devices = deviceRepository.findByUserId(current.getId());
        return ResponseObject.success(devices, "OK");
    }

    @DeleteMapping("/{id}")
    public ResponseObject deleteDevice(@PathVariable String id, HttpServletRequest request) {
        User current = (User) request.getAttribute("CURRENT_USER");
        if (current == null) return ResponseObject.error("Unauthorized");
        Optional<Device> d = deviceRepository.findById(id);
        if (d.isEmpty()) return ResponseObject.error("Device not found");
        if (!d.get().getUserId().equals(current.getId()) && current.getRole() != User.Role.admin) return ResponseObject.error("Forbidden");
        deviceRepository.delete(d.get());
        return ResponseObject.success(null, "Deleted");
    }
}
