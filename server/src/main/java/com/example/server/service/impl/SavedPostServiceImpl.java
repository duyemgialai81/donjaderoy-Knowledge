package com.example.server.service.impl;

import com.example.server.entity.Post;
import com.example.server.entity.SavedPost;
import com.example.server.entity.SavedPostId;
import com.example.server.model.dto.SavedCountDTO;
import com.example.server.model.dto.SavedStatusDTO;
import com.example.server.model.response.ResponseObject;
import com.example.server.repository.PostRepository;
import com.example.server.repository.SavedPostRepository;
import com.example.server.service.SavedPostService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class SavedPostServiceImpl implements SavedPostService {
    private static final int MAX_PAGE_SIZE = 50;

    @Autowired
    private SavedPostRepository savedPostRepository;

    @Autowired
    private PostRepository postRepository;

    @Override
    @Transactional
    public ResponseObject savePost(String userId, String postId) {
        // Validate inputs
        if (userId == null || userId.isEmpty()) {
            return ResponseObject.error("User ID không hợp lệ");
        }
        if (postId == null || postId.isEmpty()) {
            return ResponseObject.error("Post ID không hợp lệ");
        }

        // Check if post exists
        Optional<Post> post = postRepository.findById(postId);
        if (post.isEmpty()) {
            return ResponseObject.error("Không tìm thấy bài viết");
        }

        // Check if already saved
        if (savedPostRepository.existsByUserIdAndPostId(userId, postId)) {
            return ResponseObject.error("Bài viết đã được lưu trước đó");
        }

        // Create saved post
        SavedPost savedPost = SavedPost.builder()
                .userId(userId)
                .postId(postId)
                .savedAt(LocalDateTime.now())
                .build();

        savedPostRepository.save(savedPost);
        return ResponseObject.success(null, "Đã lưu bài viết");
    }

    @Override
    @Transactional
    public ResponseObject unsavePost(String userId, String postId) {
        // Validate inputs
        if (userId == null || userId.isEmpty()) {
            return ResponseObject.error("User ID không hợp lệ");
        }
        if (postId == null || postId.isEmpty()) {
            return ResponseObject.error("Post ID không hợp lệ");
        }

        // Find saved post
        Optional<SavedPost> savedPost = savedPostRepository
                .findById(new SavedPostId(userId, postId));

        if (savedPost.isEmpty()) {
            return ResponseObject.error("Bài viết chưa được lưu");
        }

        // Delete saved post
        savedPostRepository.delete(savedPost.get());
        return ResponseObject.success(null, "Đã bỏ lưu bài viết");
    }

    @Override
    public ResponseObject getSavedPosts(String userId, int page, int size) {
        // Validate inputs
        if (userId == null || userId.isEmpty()) {
            return ResponseObject.error("User ID không hợp lệ");
        }

        Page<Post> posts = postRepository.findSavedPostsByUserId(
                userId,
                PageRequest.of(normalizePage(page), normalizeSize(size))
        );

        return ResponseObject.success(
                new com.example.server.model.response.PageableObject<>(posts),
                "OK"
        );
    }

    @Override
    public ResponseObject checkSavedStatus(String userId, String postId) {
        // Validate inputs
        if (userId == null || userId.isEmpty()) {
            return ResponseObject.error("User ID không hợp lệ");
        }
        if (postId == null || postId.isEmpty()) {
            return ResponseObject.error("Post ID không hợp lệ");
        }

        boolean isSaved = savedPostRepository.existsByUserIdAndPostId(userId, postId);
        return ResponseObject.success(new SavedStatusDTO(isSaved), "OK");
    }

    @Override
    public ResponseObject getSavedPostsCount(String userId) {
        // Validate input
        if (userId == null || userId.isEmpty()) {
            return ResponseObject.error("User ID không hợp lệ");
        }

        int count = savedPostRepository.countByUserId(userId);
        return ResponseObject.success(new SavedCountDTO(count), "OK");
    }

    private int normalizePage(int page) {
        return Math.max(0, page);
    }

    private int normalizeSize(int size) {
        if (size <= 0) {
            return 10;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
