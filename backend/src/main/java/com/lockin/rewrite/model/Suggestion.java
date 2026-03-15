package com.lockin.rewrite.model;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Suggestion {
    private String id;
    private String type; // keyword, weak-phrase, etc.
    private String originalText;
    private String suggestedText;
    private int startIndex;
    private int endIndex;
    private String reason;
    private String priority; // high, medium, low
}
