package com.example.server.model.response;

import com.example.server.entity.Subjects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
