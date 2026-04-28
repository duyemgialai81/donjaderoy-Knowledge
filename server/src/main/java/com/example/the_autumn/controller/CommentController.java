package com.example.the_autumn.controller;

import com.example.the_autumn.model.dto.CommentDTO;
import com.example.the_autumn.model.response.ResponseObject;
import com.example.the_autumn.service.CommentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/comments")
public class CommentController {

    @Autowired
    private CommentService commentService;

    @PostMapping
    public ResponseObject addComment(@RequestBody CommentDTO dto, Principal principal){
        if (principal == null) return ResponseObject.error("Unauthorized");
        dto.setAuthorId(principal.getName());
        return commentService.addComment(dto);
    }

    @GetMapping("/post/{postId}")
    public ResponseObject listByPost(@PathVariable String postId) {
        return commentService.listByPost(postId);
    }

    @GetMapping("/{commentId}/replies")
    public ResponseObject listReplies(@PathVariable String commentId) {
        return commentService.listReplies(commentId);
    }

    @DeleteMapping("/{commentId}")
    public ResponseObject deleteComment(@PathVariable String commentId, Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized");
        return commentService.deleteComment(commentId, principal.getName());
    }

    @PostMapping("/{commentId}/like")
    public ResponseObject likeComment(@PathVariable String commentId, Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized");
        return commentService.likeComment(commentId, principal.getName());
    }

    @PostMapping("/{commentId}/report")
    public ResponseObject reportComment(@PathVariable String commentId, @RequestBody String reason, Principal principal) {
        if (principal == null) return ResponseObject.error("Unauthorized");
        return commentService.reportComment(commentId, principal.getName(), reason);
    }
}