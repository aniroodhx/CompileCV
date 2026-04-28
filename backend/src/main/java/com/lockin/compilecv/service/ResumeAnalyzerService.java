package com.lockin.compilecv.service;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lockin.compilecv.model.AnalysisResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class ResumeAnalyzerService {

  @Value("${gemini.api.key}")
  private String apiKey;

  // Model fallback chain — same pattern as InterviewIntel
  // apiUrl is now ignored; we build URLs from MODELS array
  private static final String[] MODELS = {
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite"
  };
  private static final String GEMINI_BASE =
      "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper;

  public ResumeAnalyzerService() {
    this.restTemplate = new RestTemplate();
    this.objectMapper = new ObjectMapper();
    this.objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
  }

  @org.springframework.cache.annotation.Cacheable(
      value = "analyses",
      key = "{#resumeText.hashCode(), #jobDescription.hashCode()}")
  public AnalysisResponse analyzeResume(
      String resumeText,
      String jobDescription,
      List<String> missingKeywordsIgnored,
      String resumeKey) {

    String prompt = buildPrompt(resumeText, jobDescription);
    try {
      String jsonResponse = callGeminiWithFallback(prompt);
      return parseResponse(jsonResponse, resumeText);
    } catch (Exception e) {
      System.err.println("Fatal error in analyzeResume: " + e.getMessage());
      e.printStackTrace();
      throw e;
    }
  }

  private String buildPrompt(String resumeText, String jobDescription) {
    String truncatedResume = resumeText.length() > 10000
        ? resumeText.substring(0, 10000) : resumeText;
    String truncatedJD = jobDescription.length() > 5000
        ? jobDescription.substring(0, 5000) : jobDescription;

    return String.format(
        """
        You are a precise ATS (Applicant Tracking System) engine combined with a career coach. Your job is to analyze a resume against a job description with consistency and accuracy.

        ---

        ## PHASE 1: KEYWORD EXTRACTION & NORMALIZATION (from Job Description only)

        Extract all meaningful keywords from the JD and normalize them:
        - Normalize aliases: "JS" → "JavaScript", "ML" → "Machine Learning", "Node" → "Node.js", "k8s" → "Kubernetes", "DB" → "Database"
        - Group variants as one: "React.js" and "React" → "React"
        - Tag each keyword as either "required" (explicitly stated as must-have) or "preferred" (nice to have / preferred qualifications)
        - ONLY extract: technical skills, programming languages, tools, frameworks, software concepts (e.g. Distributed Systems, Data Mining, Scalability, Security, Algorithms, Web Applications, Docker, Python)
        - EXCLUDE everything else: soft skills, business terms, job description language, company-specific terms, action verbs (Design, Build, Operate), locations, currencies, generic phrases
        - If unsure whether something is a technical keyword, leave it out
        - Target: 10-20 high quality technical keywords maximum

        ## PHASE 2: RESUME MATCHING (deterministic, rule-based)

        For each extracted JD keyword, check if it appears in the resume using these rules IN ORDER:
        1. Exact match (case-insensitive): "Python" matches "python"
        2. Alias match: "JS" in JD matches "JavaScript" in resume
        3. Partial stem match: "Developing" in JD matches "Development" in resume
        4. ONLY mark as matched if found by one of the above 3 rules. No fuzzy guessing.

        ## PHASE 3: SCORING (deterministic formula)

        Use this exact formula — do not deviate:
        - Required keyword match rate = matched_required / total_required (weight: 70%%)
        - Preferred keyword match rate = matched_preferred / total_preferred (weight: 30%%)
        - Final score = round((required_rate * 0.70 + preferred_rate * 0.30) * 100)
        - If no preferred keywords exist: score = round(required_rate * 100)

        ## PHASE 4: RESUME REWRITE

        Rewrite bullet points to be impactful and ATS-friendly:
        - You MUST include the exact string of each missing REQUIRED keyword verbatim in at least one improved bullet point where it contextually fits. Do not paraphrase — the exact keyword must appear so ATS systems can match it. For example if "Continuous Integration" is missing, the improved bullet must contain the exact phrase "Continuous Integration", not "CI" or "continuous integration practices".
        - Use strong action verbs (Built, Engineered, Designed, Optimized, Automated)
        - Keep it truthful — reframe existing experience, never fabricate
        - NO MARKDOWN: no **bold** or *italics* in improved text (breaks PDF generator)
        - Preserve all original numbers, dates, and specific details
        - Include ALL bullet points from each experience and project entry — do not truncate
        - Include ALL experience entries and ALL projects from the resume
        - Generate improved versions for every bullet point present

        ---

        **STRICTNESS RULES**:
        - A keyword is MISSING only if it appears nowhere in the resume (not even once)
        - Do not list soft skills like "communication" or "teamwork" as missing keywords
        - Do not list locations, company names, or job titles as keywords
        - addedKeywords MUST ONLY list keywords that you have actually written verbatim into the improved bullet points — not keywords you intended to add or paraphrased versions of them. If you did not write "Ansible" verbatim in an improved bullet, do not list "Ansible" in addedKeywords.

        **Resume Text**:
        %s

        **Job Description**:
        %s

        **OUTPUT**: Return ONLY a raw JSON object, no markdown, no backticks:
        {
          "analysis": {
            "matchScore": <calculated using Phase 3 formula>,
            "matchKeywords": ["normalized keyword strings that matched"],
            "jdKeywords": ["all normalized keywords extracted from JD"],
            "missingKeywords": ["required keywords completely absent from resume"],
            "addedKeywords": [],
            "strengths": ["2-3 specific strengths based on resume vs JD"]
          },
          "suggestions": [
            {
              "id": "unique-id",
              "type": "content",
              "originalText": "string",
              "suggestedText": "string",
              "reason": "string",
              "priority": "high"
            }
          ],
          "resumeData": {
            "personalInfo": {
              "name": "string",
              "phone": "string",
              "email": "string",
              "linkedin": "url or empty",
              "portfolio": "url or empty"
            },
            "education": [
              { "school": "string", "date": "string", "degree": "string", "gpa": "string" }
            ],
            "skills": {
              "languages": "string",
              "frameworks": "string",
              "tools": "string"
            },
            "experience": [
              {
                "title": "string",
                "company": "string",
                "date": "string",
                "location": "string (use empty string if not explicitly stated as Remote or a city)",
                "summary": "string",
                "bulletPoints": [
                  { "original": "original text", "improved": "improved text with missing keywords woven in verbatim", "accepted": false }
                ]
              }
            ],
            "projects": [
              {
                "title": "string",
                "link": "url or empty",
                "date": "string",
                "summary": "string",
                "location": "string",
                "bulletPoints": [
                  { "original": "original text", "improved": "improved text with missing keywords woven in verbatim", "accepted": false }
                ]
              }
            ],
            "certifications": [
              { "name": "string", "issuer": "string" }
            ]
          }
        }
        """,
        truncatedResume, truncatedJD);
  }

  // ── Model fallback chain ────────────────────────────────────────────────────
  // Tries gemini-2.5-flash → gemini-2.0-flash → gemini-2.0-flash-lite
  // If a model returns 429 (rate limit) or 503 (overloaded), try the next one.
  // Only throws if ALL models fail.
  private String callGeminiWithFallback(String prompt) {
    Exception lastException = null;

    for (String model : MODELS) {
      String url = String.format(GEMINI_BASE, model) + "?key=" + apiKey;
      System.out.println("Trying Gemini model: " + model);
      try {
        String result = callGeminiModel(url, prompt);
        System.out.println("Success with model: " + model);
        return result;
      } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
        System.err.println(model + " → 429 Rate Limited, trying next model...");
        lastException = e;
      } catch (org.springframework.web.client.HttpServerErrorException e) {
        if (e.getStatusCode().value() == 503) {
          System.err.println(model + " → 503 Unavailable, trying next model...");
          lastException = e;
        } else {
          throw new RuntimeException("Gemini server error on " + model + ": " + e.getMessage(), e);
        }
      } catch (Exception e) {
        System.err.println(model + " → Failed: " + e.getMessage());
        lastException = e;
      }
    }

    throw new RuntimeException(
        "All Gemini models failed. Last error: " +
        (lastException != null ? lastException.getMessage() : "unknown"),
        lastException);
  }

  private String callGeminiModel(String urlWithKey, String prompt) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);

    Map<String, String> part = Map.of("text", prompt);
    Map<String, Object> content = Map.of("parts", List.of(part));
    Map<String, Object> generationConfig = Map.of(
        "temperature", 0.0,
        "maxOutputTokens", 65536
    );
    Map<String, Object> requestBody = Map.of(
        "contents", List.of(content),
        "generationConfig", generationConfig
    );

    HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

    // Retry same model up to 2 times for transient errors
    int maxRetries = 2;
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        ResponseEntity<String> response = restTemplate.postForEntity(urlWithKey, entity, String.class);
        logFinishReason(response.getBody());
        return extractContentFromResponse(response.getBody());
      } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
        if (attempt == maxRetries) throw e; // bubble up to fallback chain
        try { Thread.sleep(2000L * attempt); } catch (InterruptedException ie) {
          Thread.currentThread().interrupt();
        }
      }
    }
    throw new RuntimeException("Max retries exceeded for model");
  }

  private void logFinishReason(String rawJson) {
    try {
      JsonNode root = objectMapper.readTree(rawJson);
      String finishReason = root.path("candidates").get(0)
          .path("finishReason").asText("UNKNOWN");
      System.out.println("Gemini finishReason: " + finishReason);
      if ("MAX_TOKENS".equals(finishReason)) {
        System.err.println("WARNING: Output truncated (MAX_TOKENS). Consider shortening prompt.");
      }
    } catch (Exception e) {
      System.err.println("Could not read finishReason: " + e.getMessage());
    }
  }

  private String extractContentFromResponse(String rawJson) {
    try {
      JsonNode root = objectMapper.readTree(rawJson);
      return root.path("candidates").get(0)
          .path("content").path("parts").get(0)
          .path("text").asText();
    } catch (Exception e) {
      System.err.println("Failed to parse Gemini response. Raw: " + rawJson);
      throw new RuntimeException("Failed to parse Gemini API response", e);
    }
  }

  private AnalysisResponse parseResponse(String llmOutput, String resumeText) {
    try {
      String cleanJson = extractJsonBlock(llmOutput);
      AnalysisResponse partialResponse = objectMapper.readValue(cleanJson, AnalysisResponse.class);
      partialResponse.setResumeText(resumeText);
      if (partialResponse.getAnalysis() != null) {
        partialResponse.setScore(partialResponse.getAnalysis().getMatchScore());
      }
      sanitizeResponse(partialResponse);
      return partialResponse;
    } catch (Exception e) {
      System.err.println("LLM Output that failed parsing: " + llmOutput);
      System.err.println("Attempting truncation recovery...");
      try {
        String recovered = recoverPartialJson(llmOutput);
        AnalysisResponse partialResponse = objectMapper.readValue(recovered, AnalysisResponse.class);
        partialResponse.setResumeText(resumeText);
        if (partialResponse.getAnalysis() != null) {
          partialResponse.setScore(partialResponse.getAnalysis().getMatchScore());
        }
        System.err.println("Truncation recovery succeeded. resumeData may be incomplete.");
        return partialResponse;
      } catch (Exception recoveryEx) {
        System.err.println("Recovery also failed: " + recoveryEx.getMessage());
        throw new RuntimeException("Failed to parse LLM JSON output", e);
      }
    }
  }

  private String recoverPartialJson(String raw) {
    String block = raw.trim();
    if (block.startsWith("```json")) block = block.substring(7);
    else if (block.startsWith("```")) block = block.substring(3);
    if (block.endsWith("```")) block = block.substring(0, block.length() - 3);
    block = block.trim();

    int start = block.indexOf("{");
    if (start < 0) throw new RuntimeException("No JSON object found in output");
    block = block.substring(start);
    block = trimIncompleteTrailingValue(block);

    StringBuilder sb = new StringBuilder(block);
    int braces = 0, brackets = 0;
    boolean inString = false, escape = false;

    for (char c : block.toCharArray()) {
      if (escape) { escape = false; continue; }
      if (c == '\\') { escape = true; continue; }
      if (c == '"') { inString = !inString; continue; }
      if (inString) continue;
      if (c == '{') braces++;
      else if (c == '}') braces--;
      else if (c == '[') brackets++;
      else if (c == ']') brackets--;
    }

    for (int i = 0; i < brackets; i++) sb.append("]");
    for (int i = 0; i < braces; i++) sb.append("}");
    return sb.toString();
  }

  private String trimIncompleteTrailingValue(String json) {
    boolean inString = false, escape = false;
    int lastStringEnd = -1, lastCloser = -1;

    for (int i = 0; i < json.length(); i++) {
      char c = json.charAt(i);
      if (escape) { escape = false; continue; }
      if (c == '\\') { escape = true; continue; }
      if (c == '"') {
        if (inString) lastStringEnd = i;
        inString = !inString;
        continue;
      }
      if (!inString && (c == '}' || c == ']')) lastCloser = i;
    }

    if (inString) {
      int cutPoint = Math.max(lastCloser, lastStringEnd);
      if (cutPoint > 0) return json.substring(0, cutPoint + 1);
    }
    return json;
  }

  private void sanitizeResponse(AnalysisResponse response) {
    if (response.getResumeData() == null) return;

    if (response.getResumeData().getExperience() != null) {
      response.getResumeData().getExperience().forEach(exp -> {
        if (exp.getBulletPoints() != null) {
          exp.getBulletPoints().forEach(bp -> {
            if (bp.getImproved() != null)
              bp.setImproved(bp.getImproved().replace("**", "").replace("*", ""));
          });
        }
      });
    }

    if (response.getResumeData().getProjects() != null) {
      response.getResumeData().getProjects().forEach(proj -> {
        if (proj.getBulletPoints() != null) {
          proj.getBulletPoints().forEach(bp -> {
            if (bp.getImproved() != null)
              bp.setImproved(bp.getImproved().replace("**", "").replace("*", ""));
          });
        }
      });
    }
  }

  private String extractJsonBlock(String text) {
    String trimmed = text.trim();
    if (trimmed.startsWith("```json")) trimmed = trimmed.substring(7);
    if (trimmed.startsWith("```")) trimmed = trimmed.substring(3);
    if (trimmed.endsWith("```")) trimmed = trimmed.substring(0, trimmed.length() - 3);

    int start = trimmed.indexOf("{");
    int end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return trimmed.substring(start, end + 1);
    return trimmed;
  }
}