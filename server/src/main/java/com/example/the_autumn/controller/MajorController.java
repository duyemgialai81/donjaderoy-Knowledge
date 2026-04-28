package com.example.the_autumn.controller;

import com.example.the_autumn.entity.Major;
import com.example.the_autumn.model.response.ResponseObject;
import com.example.the_autumn.repository.MajorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/majors")
public class MajorController {

    @Autowired
    private MajorRepository majorRepository;

    @GetMapping("")
    public ResponseObject getAllMajors() {
        try {
            List<Major> majors = majorRepository.findAll();
            return ResponseObject.success(majors, "OK");
        } catch (Exception e) {
            return ResponseObject.error("Failed to fetch majors: " + e.getMessage());
        }
    }
    @GetMapping("/{id}")
    public ResponseObject getMajorById(@PathVariable String id) {
        try {
            return majorRepository.findById(id)
                    .map(major -> ResponseObject.success(major, "OK"))
                    .orElse(ResponseObject.error("Major not found"));
        } catch (Exception e) {
            return ResponseObject.error("Failed to fetch major: " + e.getMessage());
        }
    }
}