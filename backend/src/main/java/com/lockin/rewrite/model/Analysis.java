package com.lockin.rewrite.model;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Analysis {
    private double matchScore;
    private List<String> keywordMatches;
    private List<String> missingKeywords;
    private List<String> weakPhrases;
    private List<String> strengths;
}
