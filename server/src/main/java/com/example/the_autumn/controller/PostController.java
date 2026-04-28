package com.example.the_autumn.controller;

import com.example.the_autumn.entity.User;
import com.example.the_autumn.model.dto.PostDTO;
import com.example.the_autumn.model.response.ResponseObject;
import com.example.the_autumn.service.PostService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    @Autowired
    private PostService postService;
    @PostMapping
    public ResponseObject createPost(@RequestBody PostDTO postDTO, Principal principal) {
        if (principal == null) {
            return ResponseObject.error("Unauthorized: User not authenticated.");
        }
        String authUserId = principal.getName();
        return postService.createPost(postDTO, authUserId);
    }
    @GetMapping("/{id}")
    public ResponseObject getPost(@PathVariable String id){
        return postService.getPostById(id);
    }
    @GetMapping("/{id}/tags")
    public ResponseObject getPostTags(@PathVariable String id){
        return postService.getTagsForPost(id);
    }
    @GetMapping("")
    public ResponseObject list(@RequestParam(defaultValue = "0") int page,
                               @RequestParam(defaultValue = "10") int size,
                               @RequestParam(required = false) String majorId,
                               @RequestParam(required = false) String topic){
        return postService.listPosts(page, size, majorId, topic);
    }

}
