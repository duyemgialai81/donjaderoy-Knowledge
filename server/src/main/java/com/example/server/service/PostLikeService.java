package com.example.server.service;

import com.example.server.model.response.ResponseObject;

public interface PostLikeService {
    ResponseObject likePost(String postId, String userId);
    ResponseObject unlikePost(String postId, String userId);
    // Phương thức mới: Đếm tổng số like cho bài viết
    ResponseObject getPostLikesCount(String postId); // <== MỚI
    // Phương thức mới: Kiểm tra user đã like chưa
    ResponseObject checkLikeStatus(String postId, String userId);
}
