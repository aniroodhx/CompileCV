package com.lockin.rewrite.model;

import java.io.Serializable;
import java.util.List;

public class Analysis implements Serializable {
    private double matchScore;
    private List<String> strengths;
    private List<String> missingKeywords;

    public Analysis() {
    }

    public Analysis(double matchScore, List<String> strengths, List<String> missingKeywords) {
        this.matchScore = matchScore;
        this.strengths = strengths;
        this.missingKeywords = missingKeywords;
    }

    public double getMatchScore() {
        return matchScore;
    }

    public void setMatchScore(double matchScore) {
        this.matchScore = matchScore;
    }

    public List<String> getStrengths() {
        return strengths;
    }

    public void setStrengths(List<String> strengths) {
        this.strengths = strengths;
    }

    public List<String> getMissingKeywords() {
        return missingKeywords;
    }

    public void setMissingKeywords(List<String> missingKeywords) {
        this.missingKeywords = missingKeywords;
    }

    private List<String> matchKeywords; // Keywords found in resume that matched
    private List<String> jdKeywords; // All keywords extracted from JD

    public List<String> getMatchKeywords() {
        return matchKeywords;
    }

    public void setMatchKeywords(List<String> matchKeywords) {
        this.matchKeywords = matchKeywords;
    }

    public List<String> getJdKeywords() {
        return jdKeywords;
    }

    public void setJdKeywords(List<String> jdKeywords) {
        this.jdKeywords = jdKeywords;
    }
}
