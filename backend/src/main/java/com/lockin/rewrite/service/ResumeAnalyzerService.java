package com.lockin.rewrite.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lockin.rewrite.model.AnalysisResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ResumeAnalyzerService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public ResumeAnalyzerService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public AnalysisResponse analyzeResume(String resumeText, String jobDescription, List<String> missingKeywords) {
        String prompt = buildPrompt(resumeText, jobDescription, missingKeywords);
        String jsonResponse = callGeminiApi(prompt);
        return parseResponse(jsonResponse, resumeText);
    }

    private String buildPrompt(String resumeText, String jobDescription, List<String> missingKeywords) {
        String missingKeywordsStr = (missingKeywords == null || missingKeywords.isEmpty())
                ? "None"
                : String.join(", ", missingKeywords);

        // Truncate to avoid context window issues
        String truncatedResume = resumeText.length() > 10000 ? resumeText.substring(0, 10000) : resumeText;
        String truncatedJD = jobDescription.length() > 5000 ? jobDescription.substring(0, 5000) : jobDescription;

        return String.format(
                """
                        You are an expert Resume Analyzer and Career Coach. Validate the resume against the Job Description (JD).

                        **Core Logic**:
                        1. **Match Score**: 0-100 based on keyword overlap, STAR method usage, and relevance.
                        2. **Missing Keywords**: Identify critical tech/skills in JD absent in Resume.
                        3. **Suggestions**: Provide specific, actionable rewrites. Focus on quantifying impact (numbers, %%) and using correct keywords.

                        IMPORTANT: Do NOT use the example values. Calculate specific scores and insights for THIS resume.

                        **Missing Keywords Detected**: %s

                        **Resume Text**:
                        %s

                        **Job Description**:
                        %s

                        **OUTPUT FORMAT**:
                        Return ONLY a raw JSON object (no markdown, no ```json wrapper). Use this exact structure:
                        {
                          "analysis": {
                            "matchScore": <calculated_score_0_to_100>,
                            "strengths": ["list", "of", "good", "points"],
                            "missingKeywords": ["list", "of", "missing", "keywords"]
                          },
                          "suggestions": [
                            {
                              "id": "unique-id-1",
                              "type": "content" | "formatting" | "grammar",
                              "originalText": "text from resume or empty string if new",
                              "suggestedText": "rewritten line with STAR + metrics",
                              "startIndex": number (or -1 if not applicable),
                              "endIndex": number (or -1),
                              "reason": "short explanation",
                              "priority": "high" | "medium" | "low"
                            }
                          ]
                        }
                        """,
                missingKeywordsStr, truncatedResume, truncatedJD);
    }

    private String callGeminiApi(String prompt) {
        // Construct the full URL with the API key
        String urlWithKey = apiUrl + "?key=" + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Gemini Request Body Structure:
        // { "contents": [{ "parts": [{ "text": "..." }] }] }
        Map<String, String> part = Map.of("text", prompt);
        Map<String, Object> content = Map.of("parts", List.of(part));
        Map<String, Object> requestBody = Map.of("contents", List.of(content));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(urlWithKey, entity, String.class);
            return extractContentFromResponse(response.getBody());
        } catch (Exception e) {
            throw new RuntimeException("Failed to call Gemini API: " + e.getMessage(), e);
        }
    }

    private String extractContentFromResponse(String rawJson) {
        try {
            JsonNode root = objectMapper.readTree(rawJson);
            // Gemini Response Structure:
            // candidates[0].content.parts[0].text
            return root.path("candidates")
                    .get(0)
                    .path("content")
                    .path("parts")
                    .get(0)
                    .path("text")
                    .asText();
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Gemini API response: " + rawJson, e);
        }
    }

    private AnalysisResponse parseResponse(String llmOutput, String resumeText) {
        try {
            String cleanJson = extractJsonBlock(llmOutput);
            AnalysisResponse partialResponse = objectMapper.readValue(cleanJson, AnalysisResponse.class);

            // Re-attach original resume text
            partialResponse.setResumeText(resumeText);

            // Set top-level score
            if (partialResponse.getAnalysis() != null) {
                partialResponse.setScore(partialResponse.getAnalysis().getMatchScore());
            }

            return partialResponse;
        } catch (Exception e) {
            System.err.println("LLM Output that failed parsing: " + llmOutput);
            throw new RuntimeException("Failed to parse LLM JSON output", e);
        }
    }

    private String extractJsonBlock(String text) {
        String trimmed = text.trim();
        // Remove markdown code blocks if present
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        }
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }

        int start = trimmed.indexOf("{");
        int end = trimmed.lastIndexOf("}");

        if (start >= 0 && end > start) {
            return trimmed.substring(start, end + 1);
        }
        return trimmed;
    }
}
