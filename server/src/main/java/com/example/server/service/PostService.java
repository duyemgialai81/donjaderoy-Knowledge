package com.example.server.service;

import com.example.server.model.dto.PostDTO;
import com.example.server.model.response.ResponseObject;

public interface PostService {
    ResponseObject createPost(PostDTO postDTO, String authUserId);
    ResponseObject getPostById(String id);
    ResponseObject listPosts(int page, int size, String majorId, String topic);
    ResponseObject getTagsForPost(String postId);
    ResponseObject getPostsByUser(String userId, int page, int size);
    ResponseObject deletePost(String postId, String userId);
}