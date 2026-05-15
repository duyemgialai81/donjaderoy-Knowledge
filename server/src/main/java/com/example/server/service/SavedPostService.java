package com.example.server.service;

import com.example.server.model.response.ResponseObject;

public interface SavedPostService {
    ResponseObject savePost(String userId, String postId);
    ResponseObject unsavePost(String userId, String postId);
    ResponseObject getSavedPosts(String userId, int page, int size);
    ResponseObject checkSavedStatus(String userId, String postId);
    ResponseObject getSavedPostsCount(String userId);
}