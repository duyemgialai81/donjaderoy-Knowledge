package com.example.the_autumn.model.dto;

public  class SavedStatusDTO {
    private boolean isSaved;

    public SavedStatusDTO(boolean isSaved) {
        this.isSaved = isSaved;
    }

    public boolean isSaved() {
        return isSaved;
    }

    public void setSaved(boolean saved) {
        isSaved = saved;
    }

    // Alternative getter for JSON serialization
    public boolean getIsSaved() {
        return isSaved;
    }
}