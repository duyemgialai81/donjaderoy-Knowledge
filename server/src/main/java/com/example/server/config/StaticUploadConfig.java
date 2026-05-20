package com.example.server.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.TimeUnit;

@Configuration
public class StaticUploadConfig implements WebMvcConfigurer {
    private final Path uploadRoot = Paths.get("uploads").toAbsolutePath().normalize();

    @PostConstruct
    public void ensureUploadDirectories() throws IOException {
        Files.createDirectories(uploadRoot.resolve("avatars"));
        Files.createDirectories(uploadRoot.resolve("chat"));
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String uploadPath = uploadRoot.toUri().toString();
        if (!uploadPath.endsWith("/")) {
            uploadPath += "/";
        }

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadPath)
                .setCacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic());
    }
}
