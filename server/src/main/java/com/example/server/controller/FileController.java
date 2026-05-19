package com.example.server.controller;

import com.example.server.model.response.ResponseObject;
import com.example.server.security.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.Principal;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping
    public ResponseObject uploadFile(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request,
            Principal principal) {
        String userId = resolveUserId(request, principal);
        if (userId == null) return ResponseObject.error("Unauthorized");
        if (file == null || file.isEmpty()) return ResponseObject.error("File is required");
        if (file.getSize() > 25 * 1024 * 1024) return ResponseObject.error("File must be smaller than 25MB");

        try {
            String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
            String original = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
            String ext = "";
            int dot = original.lastIndexOf('.');
            if (dot >= 0 && dot < original.length() - 1) {
                ext = original.substring(dot).replaceAll("[^A-Za-z0-9.]", "").toLowerCase(Locale.ROOT);
            }

            Path dir = Paths.get("uploads", "chat").toAbsolutePath().normalize();
            Files.createDirectories(dir);
            String fileName = userId + "-" + UUID.randomUUID() + ext;
            Path target = dir.resolve(fileName).normalize();
            file.transferTo(target.toFile());

            return ResponseObject.success(Map.of(
                    "url", "/uploads/chat/" + fileName,
                    "name", original,
                    "size", file.getSize(),
                    "type", contentType
            ), "File uploaded");
        } catch (Exception e) {
            return ResponseObject.error("Upload failed: " + e.getMessage());
        }
    }

    private String resolveUserId(HttpServletRequest request, Principal principal) {
        if (principal != null && hasText(principal.getName())) {
            return principal.getName();
        }
        String token = resolveToken(request);
        if (!hasText(token) || !jwtTokenProvider.validateToken(token)) {
            return null;
        }
        return jwtTokenProvider.getUserIdFromToken(token);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        String headerToken = request.getHeader("X-Auth-Token");
        if (hasText(headerToken)) {
            return headerToken;
        }
        String queryToken = request.getParameter("access_token");
        if (hasText(queryToken)) {
            return queryToken;
        }
        String formToken = request.getParameter("token");
        return hasText(formToken) ? formToken : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
