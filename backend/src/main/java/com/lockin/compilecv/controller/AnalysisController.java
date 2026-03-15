package com.lockin.compilecv.controller;

import com.lockin.compilecv.model.AnalysisResponse;
import com.lockin.compilecv.service.DocumentParserService;
import com.lockin.compilecv.service.ResumeAnalyzerService;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class AnalysisController {

    private final DocumentParserService documentParserService;
    private final ResumeAnalyzerService resumeAnalyzerService;
    private final com.lockin.compilecv.service.LatexService latexService;

    private final Map<String, List<Long>> requestLog = new java.util.concurrent.ConcurrentHashMap<>();
    private static final int MAX_REQUESTS = 5;
    private static final long WINDOW_MS = 60_000; // 1 minute

    private boolean isRateLimited(String ip) {
        long now = System.currentTimeMillis();
        requestLog.merge(ip, new java.util.ArrayList<>(List.of(now)), (existing, newList) -> {
            existing.removeIf(t -> now - t > WINDOW_MS);
            existing.add(now);
            return existing;
        });
        return requestLog.get(ip).size() > MAX_REQUESTS;
    }

    public AnalysisController(
            DocumentParserService documentParserService,
            ResumeAnalyzerService resumeAnalyzerService,
            com.lockin.compilecv.service.LatexService latexService) {
        this.documentParserService = documentParserService;
        this.resumeAnalyzerService = resumeAnalyzerService;
        this.latexService = latexService;
    }

    @PostMapping("/process")
    public ResponseEntity<?> processResume(
            @RequestParam("file") MultipartFile file,
            @RequestParam("jobDescription") String jobDescription,
            HttpServletRequest request) {
        try {
            String ip = request.getRemoteAddr();
            if (isRateLimited(ip)) {
                return ResponseEntity.status(429).body(Map.of("error", "Too many requests. Please wait a minute."));
            }

            if (file.isEmpty() || jobDescription == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "File and job description are required"));
            }

            byte[] fileData = file.getBytes();
            String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";

            String resumeText;
            if (fileName.endsWith(".pdf")) {
                resumeText = documentParserService.parsePdf(fileData);
            } else {
                resumeText = documentParserService.parseDocx(fileData);
            }

            List<String> missingKeywords = new ArrayList<>();
            AnalysisResponse result = resumeAnalyzerService.analyzeResume(resumeText, jobDescription, missingKeywords, fileName);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/generate-pdf")
    public ResponseEntity<?> generatePdf(@RequestBody com.lockin.compilecv.model.resume.ResumeData resumeData) {
        try {
            byte[] pdfBytes = latexService.generatePdf(resumeData);
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"resume.pdf\"")
                    .body(pdfBytes);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}