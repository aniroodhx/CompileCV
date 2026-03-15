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
public class AnalysisResponse {
    private String resumeText;
    private Analysis analysis;
    private List<Suggestion> suggestions;
    private double score;
}
