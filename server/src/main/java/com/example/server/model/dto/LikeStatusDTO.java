package com.example.server.model.dto;

public class LikeStatusDTO {
    private boolean isLiked;

    public LikeStatusDTO(boolean isLiked) {
        this.isLiked = isLiked;
    }

    public boolean isLiked() { return isLiked; }
    public void setLiked(boolean liked) { isLiked = liked; }
}