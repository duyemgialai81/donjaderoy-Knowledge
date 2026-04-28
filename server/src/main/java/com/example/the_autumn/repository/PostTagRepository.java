package com.example.the_autumn.repository;

import com.example.the_autumn.entity.PostTag;
import com.example.the_autumn.entity.PostTagId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostTagRepository extends JpaRepository<PostTag, PostTagId> {
    List<PostTag> findByPostId(String postId);
    List<PostTag> findByTagId(Integer tagId);
}
