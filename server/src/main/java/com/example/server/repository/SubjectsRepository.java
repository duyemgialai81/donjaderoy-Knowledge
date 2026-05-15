package com.example.server.repository;

import com.example.server.entity.Subjects;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubjectsRepository extends JpaRepository<Subjects, Integer> {

    List<Subjects> findByMajor_Id(String majorId);
}
