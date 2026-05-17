package com.example.server.controller;

import com.example.server.model.dto.CommentDTO;
import com.example.server.model.response.ResponseObject;
import com.example.server.service.CommentService;
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
    public ResponseObject listByPost(@PathVariable String postId,
                                     @RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "20") int size) {
        return commentService.listByPost(postId, page, size);
    }

    @GetMapping("/{commentId}/replies")
    public ResponseObject listReplies(@PathVariable String commentId,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "20") int size) {
        return commentService.listReplies(commentId, page, size);
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
