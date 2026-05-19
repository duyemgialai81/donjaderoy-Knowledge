package com.example.server.service;

import com.example.server.model.dto.CommentDTO;
import com.example.server.model.response.ResponseObject;

public interface CommentService {
    ResponseObject addComment(CommentDTO dto);
    ResponseObject listByPost(String postId, int page, int size);
    ResponseObject listReplies(String commentId, int page, int size);
    ResponseObject updateComment(String commentId, String userId, String content);
    ResponseObject deleteComment(String commentId, String userId);
    ResponseObject likeComment(String commentId, String userId);
    ResponseObject reportComment(String commentId, String userId, String reason);
}
