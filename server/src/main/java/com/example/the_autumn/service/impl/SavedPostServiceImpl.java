package com.example.the_autumn.service.impl;

import com.example.the_autumn.entity.Post;
import com.example.the_autumn.entity.SavedPost;
import com.example.the_autumn.entity.SavedPostId;
import com.example.the_autumn.model.dto.SavedCountDTO;
import com.example.the_autumn.model.dto.SavedStatusDTO;
import com.example.the_autumn.model.response.ResponseObject;
import com.example.the_autumn.repository.PostRepository;
import com.example.the_autumn.repository.SavedPostRepository;
import com.example.the_autumn.service.SavedPostService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class SavedPostServiceImpl implements SavedPostService {

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

        // Get all saved post IDs for this user
        List<String> savedPostIds = savedPostRepository.findByUserId(userId)
                .stream()
                .map(SavedPost::getPostId)
                .collect(Collectors.toList());

        if (savedPostIds.isEmpty()) {
            return ResponseObject.success(
                    new com.example.the_autumn.model.response.PageableObject<>(
                            List.of(), page, size, 0, 0
                    ),
                    "Chưa có bài viết đã lưu"
            );
        }

        // Get post details with pagination
        Page<Post> posts = postRepository.findByIdIn(savedPostIds, PageRequest.of(page, size));

        return ResponseObject.success(
                new com.example.the_autumn.model.response.PageableObject<>(posts),
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
}