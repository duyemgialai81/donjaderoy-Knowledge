package com.example.the_autumn.repository;

import com.example.the_autumn.entity.Subjects;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import javax.security.auth.Subject;
import java.util.List;

@Repository
public interface SubjectsRepository extends JpaRepository<Subjects, Integer> {

    List<Subjects> findByMajor_Id(String majorId);
}
