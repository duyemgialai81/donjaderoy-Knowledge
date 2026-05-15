package com.example.server.controller;

import com.example.server.model.response.ResponseObject;
import com.example.server.model.response.SubjectsResponse;
import com.example.server.service.impl.SubjectsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/subject")
public class SubjectsController {
    @Autowired
    private SubjectsService subjectsService;

    @GetMapping("/{id}")
    public ResponseObject<?> getSubjectById(@PathVariable String id) {
        List<SubjectsResponse> list = subjectsService.getSubjectsByMajor(id);
        return new ResponseObject<>(list,"Hiển thị thành công");
    }
}
