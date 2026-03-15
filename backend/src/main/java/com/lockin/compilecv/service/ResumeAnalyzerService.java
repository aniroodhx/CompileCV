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

  @Value("${gemini.api.url}")
  private String apiUrl;

  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper;

  public ResumeAnalyzerService() {
    this.restTemplate = new RestTemplate();
    this.objectMapper = new ObjectMapper();
    this.objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
  }

  @org.springframework.cache.annotation.Cacheable(value = "analyses", key = "{#resumeText.hashCode(), #jobDescription.hashCode()}")
  public AnalysisResponse analyzeResume(String resumeText, String jobDescription, List<String> missingKeywordsIgnored,
      String resumeKey) {

    String prompt = buildPrompt(resumeText, jobDescription);
    try {
      String jsonResponse = callGeminiApi(prompt);
      return parseResponse(jsonResponse, resumeText);
    } catch (Exception e) {
      System.err.println("Fatal error in analyzeResume: " + e.getMessage());
      e.printStackTrace();
      throw e;
    }
  }

  private String buildPrompt(String resumeText, String jobDescription) {
    String truncatedResume = resumeText.length() > 10000 ? resumeText.substring(0, 10000) : resumeText;
    String truncatedJD = jobDescription.length() > 5000 ? jobDescription.substring(0, 5000) : jobDescription;

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
        - EXCLUDE everything else: soft skills, business terms, job description language, company-specific terms, action verbs (Design, Build, Operate), locations, currencies, generic phrases (Cross Border, Local Language, Freelance, Domain Expert, High Judgment, Creativity, Simplicity, Global Expansion, Customer Empowerment)
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
        - Weave in missing REQUIRED keywords naturally where they contextually fit
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
        - addedKeywords = keywords you successfully wove into improved bullet points that weren't in original

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
                  { "original": "original text", "improved": "improved text", "accepted": false }
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
                  { "original": "original text", "improved": "improved text", "accepted": false }
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

  private String callGeminiApi(String prompt) {
    String urlWithKey = apiUrl + "?key=" + apiKey;

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);

    Map<String, String> part = Map.of("text", prompt);
    Map<String, Object> content = Map.of("parts", List.of(part));
    Map<String, Object> generationConfig = Map.of(
        "temperature", 0.0,
        // FIX: Bumped from 8192. The prompt itself consumes ~2000-3000 tokens,
        // leaving insufficient room for a full resume JSON response. 16384 gives
        // comfortable headroom for any realistic resume length.
        "maxOutputTokens", 65536
    );
    Map<String, Object> requestBody = Map.of(
        "contents", List.of(content),
        "generationConfig", generationConfig
    );

    HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

    int maxRetries = 3;
    int retryDelay = 2000;

    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        ResponseEntity<String> response = restTemplate.postForEntity(urlWithKey, entity, String.class);

        // FIX: Log the finishReason so truncation is visible in logs.
        // If finishReason == "MAX_TOKENS", the output was cut off — raise maxOutputTokens further.
        logFinishReason(response.getBody());

        return extractContentFromResponse(response.getBody());
      } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
        System.err.println("Gemini 429 Rate Limit hit. Attempt " + attempt + " of " + maxRetries);
        if (attempt == maxRetries) {
          throw new RuntimeException("Gemini API Rate Limit Exceeded after retries: " + e.getMessage(), e);
        }
        try {
          Thread.sleep(retryDelay * attempt);
        } catch (InterruptedException ie) {
          Thread.currentThread().interrupt();
          throw new RuntimeException("Interrupted during retry wait", ie);
        }
      } catch (Exception e) {
        System.err.println("Gemini API Call Failed. URL: " + urlWithKey);
        throw new RuntimeException("Failed to call Gemini API: " + e.getMessage(), e);
      }
    }
    throw new RuntimeException("Unreachable code in callGeminiApi");
  }

  /**
   * FIX: Log the finishReason from the Gemini response.
   * "STOP"       = completed normally (good)
   * "MAX_TOKENS" = output was truncated — increase maxOutputTokens
   * "SAFETY"     = blocked by safety filter
   */
  private void logFinishReason(String rawJson) {
    try {
      JsonNode root = objectMapper.readTree(rawJson);
      String finishReason = root.path("candidates").get(0).path("finishReason").asText("UNKNOWN");
      System.out.println("Gemini finishReason: " + finishReason);
      if ("MAX_TOKENS".equals(finishReason)) {
        System.err.println("WARNING: Gemini output was truncated (MAX_TOKENS). " +
            "Increase maxOutputTokens in callGeminiApi() or shorten the prompt.");
      }
    } catch (Exception e) {
      System.err.println("Could not read finishReason from response: " + e.getMessage());
    }
  }

  private String extractContentFromResponse(String rawJson) {
    try {
      JsonNode root = objectMapper.readTree(rawJson);
      return root.path("candidates")
          .get(0)
          .path("content")
          .path("parts")
          .get(0)
          .path("text")
          .asText();
    } catch (Exception e) {
      System.err.println("Failed to parse Gemini API response. Raw Response: " + rawJson);
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

      // FIX: Attempt truncation recovery before giving up.
      // If Gemini hit MAX_TOKENS, the JSON is structurally incomplete. Try to
      // salvage the analysis block (which always comes first) so the frontend
      // gets at least the score and keywords, even if resumeData is missing.
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

  /**
   * FIX: Attempt to close a truncated JSON object so Jackson can parse whatever
   * completed before the cutoff.
   *
   * Strategy: count unclosed braces/brackets and append the missing closers.
   * This won't repair a JSON object truncated mid-string-value, but it handles
   * the common case where Gemini stops cleanly after a complete field.
   */
  private String recoverPartialJson(String raw) {
    String block = raw.trim();

    // Strip markdown fences
    if (block.startsWith("```json")) block = block.substring(7);
    else if (block.startsWith("```")) block = block.substring(3);
    if (block.endsWith("```")) block = block.substring(0, block.length() - 3);
    block = block.trim();

    int start = block.indexOf("{");
    if (start < 0) throw new RuntimeException("No JSON object found in output");
    block = block.substring(start);

    // Trim any trailing incomplete string value (ends mid-quote)
    // Find the last complete field by walking back from the end to the last '",' or '}'
    block = trimIncompleteTrailingValue(block);

    // Count and close unclosed structures
    StringBuilder sb = new StringBuilder(block);
    int braces = 0;
    int brackets = 0;
    boolean inString = false;
    boolean escape = false;

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

    // Close any dangling arrays first, then objects
    for (int i = 0; i < brackets; i++) sb.append("]");
    for (int i = 0; i < braces; i++) sb.append("}");

    return sb.toString();
  }

  /**
   * Trim trailing content that would produce invalid JSON —
   * e.g. a string value cut off mid-word: `"email": "user@exa`
   * Walk backwards to find the last `}` or `]` or `"value"` that is complete.
   */
  private String trimIncompleteTrailingValue(String json) {
    // Find the last position that is either a closing brace/bracket or a complete string end
    int lastSafe = -1;
    boolean inString = false;
    boolean escape = false;
    int lastStringEnd = -1;
    int lastCloser = -1;

    for (int i = 0; i < json.length(); i++) {
      char c = json.charAt(i);
      if (escape) { escape = false; continue; }
      if (c == '\\') { escape = true; continue; }
      if (c == '"') {
        if (inString) {
          lastStringEnd = i; // end of a complete string value
        }
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (c == '}' || c == ']') lastCloser = i;
      }
    }

    // If we're still inside a string at the end, the string was truncated.
    // Cut back to after the last complete closing structure.
    if (inString) {
      int cutPoint = Math.max(lastCloser, lastStringEnd);
      if (cutPoint > 0) {
        return json.substring(0, cutPoint + 1);
      }
    }

    return json;
  }

  private void sanitizeResponse(AnalysisResponse response) {
    if (response.getResumeData() == null)
      return;

    if (response.getResumeData().getExperience() != null) {
      response.getResumeData().getExperience().forEach(exp -> {
        if (exp.getBulletPoints() != null) {
          exp.getBulletPoints().forEach(bp -> {
            if (bp.getImproved() != null) {
              bp.setImproved(bp.getImproved().replace("**", "").replace("*", ""));
            }
          });
        }
      });
    }

    if (response.getResumeData().getProjects() != null) {
      response.getResumeData().getProjects().forEach(proj -> {
        if (proj.getBulletPoints() != null) {
          proj.getBulletPoints().forEach(bp -> {
            if (bp.getImproved() != null) {
              bp.setImproved(bp.getImproved().replace("**", "").replace("*", ""));
            }
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

    if (start >= 0 && end > start) {
      return trimmed.substring(start, end + 1);
    }
    return trimmed;
  }
}