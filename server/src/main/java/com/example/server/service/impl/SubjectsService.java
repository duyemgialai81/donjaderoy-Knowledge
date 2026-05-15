package com.example.server.service.impl;

import com.example.server.entity.Subjects;
import com.example.server.model.response.SubjectsResponse;
import com.example.server.repository.SubjectsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SubjectsService {
    @Autowired
    private SubjectsRepository subjectsRepository;

    public List<SubjectsResponse> getSubjectsByMajor(String majorId) {
        if (majorId == null || majorId.isBlank()) {
            return Collections.emptyList();
        }
        List<Subjects> subjects = subjectsRepository.findByMajor_Id(majorId);
        return subjects.stream()
                .map(SubjectsResponse::new)
                .collect(Collectors.toList());
    }
}
