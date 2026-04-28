package com.example.the_autumn.service;

import com.example.the_autumn.model.response.ResponseObject;

public interface SavedPostService {
    ResponseObject savePost(String userId, String postId);
    ResponseObject unsavePost(String userId, String postId);
    ResponseObject getSavedPosts(String userId, int page, int size);
    ResponseObject checkSavedStatus(String userId, String postId);
    ResponseObject getSavedPostsCount(String userId);
}