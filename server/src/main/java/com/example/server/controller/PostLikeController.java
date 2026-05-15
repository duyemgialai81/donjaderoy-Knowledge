package com.example.server.controller;

import com.example.server.model.response.ResponseObject;
import com.example.server.service.impl.PostLikeServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/posts-like")
public class PostLikeController {
    @Autowired
    private PostLikeServiceImpl postLikeService;

    @PostMapping("/{id}/like")
    public ResponseObject like(@PathVariable String id, Principal principal) {
        if (principal == null) {
            // Spring Security thường đã chặn lỗi này, nhưng kiểm tra là tốt
            return ResponseObject.error("Unauthorized: User not authenticated.");
        }
        String userId = principal.getName();
        return postLikeService.likePost(id, userId);
    }
    @PostMapping("/{id}/unlike")
    public ResponseObject unlike(@PathVariable String id, Principal principal) {
        if (principal == null) {
            return ResponseObject.error("Unauthorized: User not authenticated.");
        }
        // Lấy ID người dùng
        String userId = principal.getName();
        return postLikeService.unlikePost(id, userId);
    }
    @GetMapping("/{postId}/likes/count")
    public ResponseObject<?>listLikeCount(@PathVariable String postId) {
        return new ResponseObject<>(postLikeService.getPostLikesCount(postId),"Hiển Thị Dữ liệu thành công");
    }
    @GetMapping("/{postId}/like-status")
    public ResponseObject<?>listLikeCountUserCheck(@PathVariable String postId,Principal principal) {
        if (principal == null) {
            return ResponseObject.error("Unauthorized: User not authenticated.");
        }
        String userId = principal.getName();
        return new ResponseObject<>(postLikeService.checkLikeStatus(postId,userId),"Hiển Thị Dữ liệu thành công");
    }

}
