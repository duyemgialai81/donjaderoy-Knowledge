package com.example.the_autumn.controller;

import com.example.the_autumn.model.response.ResponseObject;
import com.example.the_autumn.service.SavedPostService;
import com.example.the_autumn.service.impl.SavedPostServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/saved-posts")
public class SavedPostController {

    @Autowired
    private SavedPostServiceImpl savedPostService;

    @PostMapping
    public ResponseObject savePost(
            @RequestParam String userId,
            @RequestParam String postId) {
        return savedPostService.savePost(userId, postId);
    }

    @DeleteMapping
    public ResponseObject unsavePost(
            @RequestParam String userId,
            @RequestParam String postId) {
        return savedPostService.unsavePost(userId, postId);
    }

    @GetMapping("/{userId}")
    public ResponseObject getSavedPosts(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return savedPostService.getSavedPosts(userId, page, size);
    }

    @GetMapping("/check")
    public ResponseObject checkSavedStatus(
            @RequestParam String userId,
            @RequestParam String postId) {
        return savedPostService.checkSavedStatus(userId, postId);
    }

    @GetMapping("/{userId}/count")
    public ResponseObject getSavedPostsCount(@PathVariable String userId) {
        return savedPostService.getSavedPostsCount(userId);
    }
}
