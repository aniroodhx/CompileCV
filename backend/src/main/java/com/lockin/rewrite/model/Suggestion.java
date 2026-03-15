package com.lockin.rewrite.model;

public class Suggestion {
    private String id;
    private String type;
    private String originalText;
    private String suggestedText;
    private int startIndex;
    private int endIndex;
    private String reason;
    private String priority;

    public Suggestion() {
    }

    public Suggestion(String id, String type, String originalText, String suggestedText, int startIndex, int endIndex,
            String reason, String priority) {
        this.id = id;
        this.type = type;
        this.originalText = originalText;
        this.suggestedText = suggestedText;
        this.startIndex = startIndex;
        this.endIndex = endIndex;
        this.reason = reason;
        this.priority = priority;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getOriginalText() {
        return originalText;
    }

    public void setOriginalText(String originalText) {
        this.originalText = originalText;
    }

    public String getSuggestedText() {
        return suggestedText;
    }

    public void setSuggestedText(String suggestedText) {
        this.suggestedText = suggestedText;
    }

    public int getStartIndex() {
        return startIndex;
    }

    public void setStartIndex(int startIndex) {
        this.startIndex = startIndex;
    }

    public int getEndIndex() {
        return endIndex;
    }

    public void setEndIndex(int endIndex) {
        this.endIndex = endIndex;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }
}
