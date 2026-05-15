package com.example.server.model.dto;

public class SavedCountDTO {
    private int count;

    public SavedCountDTO(int count) {
        this.count = count;
    }

    public int getCount() {
        return count;
    }

    public void setCount(int count) {
        this.count = count;
    }
}