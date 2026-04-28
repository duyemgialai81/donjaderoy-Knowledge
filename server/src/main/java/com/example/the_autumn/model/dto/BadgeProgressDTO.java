package com.example.the_autumn.model.dto;

import com.example.the_autumn.entity.Badge;

public class BadgeProgressDTO {
    private String id;
    private String name;
    private String icon;
    private String description;
    private Integer requiredPoints;
    private String color;
    private boolean achieved;

    public BadgeProgressDTO(Badge badge, boolean achieved) {
        this.id = badge.getId();
        this.name = badge.getName();
        this.icon = badge.getIcon();
        this.description = badge.getDescription();
        this.requiredPoints = badge.getRequiredPoints();
        this.color = badge.getColor();
        this.achieved = achieved;
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getRequiredPoints() { return requiredPoints; }
    public void setRequiredPoints(Integer requiredPoints) { this.requiredPoints = requiredPoints; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public boolean isAchieved() { return achieved; }
    public void setAchieved(boolean achieved) { this.achieved = achieved; }
}

