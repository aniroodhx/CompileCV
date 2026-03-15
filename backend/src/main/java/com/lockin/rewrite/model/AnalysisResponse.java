package com.lockin.rewrite.model;

import java.util.List;

public class AnalysisResponse {
    private String resumeText;
    private Analysis analysis;
    private List<Suggestion> suggestions;
    private double score;

    public AnalysisResponse() {
    }

    public AnalysisResponse(String resumeText, Analysis analysis, List<Suggestion> suggestions, double score) {
        this.resumeText = resumeText;
        this.analysis = analysis;
        this.suggestions = suggestions;
        this.score = score;
    }

    public String getResumeText() {
        return resumeText;
    }

    public void setResumeText(String resumeText) {
        this.resumeText = resumeText;
    }

    public Analysis getAnalysis() {
        return analysis;
    }

    public void setAnalysis(Analysis analysis) {
        this.analysis = analysis;
    }

    public List<Suggestion> getSuggestions() {
        return suggestions;
    }

    public void setSuggestions(List<Suggestion> suggestions) {
        this.suggestions = suggestions;
    }

    public double getScore() {
        return score;
    }

    public void setScore(double score) {
        this.score = score;
    }
}
