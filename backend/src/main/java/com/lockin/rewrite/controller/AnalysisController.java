package com.lockin.rewrite.controller;

import com.lockin.rewrite.model.AnalysisResponse;
import com.lockin.rewrite.service.DocumentParserService;
import com.lockin.rewrite.service.ResumeAnalyzerService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000")
public class AnalysisController {

    private final S3Client s3Client;
    private final DocumentParserService documentParserService;
    private final ResumeAnalyzerService resumeAnalyzerService;

    // We'll need a simple utility to extract JD keywords as well
    // For now, let's implement a basic keyword extraction within the controller or
    // a util
    // reusing the logic from the node app (using a simple set of tech words)

    private final String bucketName;

    public AnalysisController(S3Client s3Client,
            DocumentParserService documentParserService,
            ResumeAnalyzerService resumeAnalyzerService,
            @org.springframework.beans.factory.annotation.Value("${aws.s3.bucketName}") String bucketName) {
        this.s3Client = s3Client;
        this.documentParserService = documentParserService;
        this.resumeAnalyzerService = resumeAnalyzerService;
        this.bucketName = bucketName;
    }

    @PostMapping("/process")
    public ResponseEntity<?> processResume(@RequestBody Map<String, String> payload) {
        try {
            String resumeKey = payload.get("resumeKey");
            String jobDescription = payload.get("jobDescription");

            if (resumeKey == null || jobDescription == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Resume and JD are required"));
            }

            // 1. Download Resume from S3
            // Note: We use the S3Client directly here to get the bytes
            ResponseBytes<GetObjectResponse> objectBytes = s3Client.getObjectAsBytes(GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(resumeKey)
                    .build());

            byte[] fileData = objectBytes.asByteArray();

            // 2. Parse DOCX
            // 2. Parse File based on extension
            String resumeText;
            if (resumeKey.toLowerCase().endsWith(".pdf")) {
                resumeText = documentParserService.parsePdf(fileData);
            } else {
                resumeText = documentParserService.parseDocx(fileData);
            }

            // 3. Extract Keywords (Simplified version for now, relying on LLM for heavy
            // lifting usually,
            // but the frontend logic did a pre-check. Let's pass empty list to LLM for now
            // and let it decide,
            // or implement the keyword extractor. For speed, let's pass empty list or
            // implement a basic one.)
            List<String> missingKeywords = new ArrayList<>(); // TODO: Implement matching logic if strictly needed

            // 4. Run Analysis
            AnalysisResponse result = resumeAnalyzerService.analyzeResume(resumeText, jobDescription, missingKeywords,
                    resumeKey);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
