package com.example.the_autumn.model.response;

import com.example.the_autumn.entity.Major;
import com.example.the_autumn.entity.Subjects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubjectsResponse {
    private String id;
    private String name;
    private String code;
    public SubjectsResponse(Subjects subjects){
        this.id = subjects.getId();
        this.name = subjects.getName();
        this.code = subjects.getCode();
    }
}
