package com.lockin.compilecv.controller;

import com.lockin.compilecv.model.AnalysisResponse;
import com.lockin.compilecv.service.DocumentParserService;
import com.lockin.compilecv.service.ResumeAnalyzerService;
import com.lockin.compilecv.service.DocxService;
import com.lockin.compilecv.service.TokenBucketRateLimiter;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class AnalysisController {

    private final DocumentParserService documentParserService;
    private final ResumeAnalyzerService resumeAnalyzerService;
    private final com.lockin.compilecv.service.LatexService latexService;
    private final DocxService docxService;
    private final TokenBucketRateLimiter rateLimiter;

    // Idempotency: caches the result of an in-flight or recently-completed
    // scoring request keyed by a hash of (file bytes + job description).
    // Guards against a user double-submitting the same resume+JD pair —
    // e.g. a slow network causing them to hit "Analyze" twice, or a retry
    // after a client-side timeout that actually succeeded server-side.
    // Without this, a double-submit re-parses the file and re-calls the
    // LLM a second time for identical input, wasting real API cost.
    private final Map<String, AnalysisResponse> idempotencyCache = new ConcurrentHashMap<>();
    private static final long IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes
    private final Map<String, Long> idempotencyTimestamps = new ConcurrentHashMap<>();

    public AnalysisController(
            DocumentParserService documentParserService,
            ResumeAnalyzerService resumeAnalyzerService,
            com.lockin.compilecv.service.LatexService latexService,
            DocxService docxService,
            TokenBucketRateLimiter rateLimiter) {
        this.documentParserService = documentParserService;
        this.resumeAnalyzerService = resumeAnalyzerService;
        this.latexService = latexService;
        this.docxService = docxService;
        this.rateLimiter = rateLimiter;
    }

    /** SHA-256 of file bytes + job description — identical submissions hash identically. */
    private String computeIdempotencyKey(byte[] fileData, String jobDescription) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(fileData);
            digest.update(jobDescription.getBytes());
            byte[] hash = digest.digest();
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            // Fall back to a key that simply never matches, so idempotency
            // degrades to "always process" rather than failing the request.
            return "no-hash-" + System.nanoTime();
        }
    }

    private void evictExpiredIdempotencyEntries() {
        long now = System.currentTimeMillis();
        idempotencyTimestamps.entrySet().removeIf(e -> {
            boolean expired = now - e.getValue() > IDEMPOTENCY_TTL_MS;
            if (expired) idempotencyCache.remove(e.getKey());
            return expired;
        });
    }

    @PostMapping("/process")
    public ResponseEntity<?> processResume(
            @RequestParam("file") MultipartFile file,
            @RequestParam("jobDescription") String jobDescription,
            HttpServletRequest request) {
        try {
            String ip = request.getRemoteAddr();
            if (!rateLimiter.tryConsume(ip)) {
                return ResponseEntity.status(429).body(Map.of("error", "Too many requests. Please wait a minute."));
            }

            if (file.isEmpty() || jobDescription == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "File and job description are required"));
            }

            byte[] fileData = file.getBytes();

            evictExpiredIdempotencyEntries();
            String idempotencyKey = computeIdempotencyKey(fileData, jobDescription);
            AnalysisResponse existing = idempotencyCache.get(idempotencyKey);
            if (existing != null) {
                return ResponseEntity.ok(existing);
            }

            String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";

            String resumeText;
            if (fileName.endsWith(".pdf")) {
                resumeText = documentParserService.parsePdf(fileData);
            } else {
                resumeText = documentParserService.parseDocx(fileData);
            }

            List<String> missingKeywords = new ArrayList<>();
            AnalysisResponse result = resumeAnalyzerService.analyzeResume(resumeText, jobDescription, missingKeywords, fileName);

            idempotencyCache.put(idempotencyKey, result);
            idempotencyTimestamps.put(idempotencyKey, System.currentTimeMillis());

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

    @PostMapping("/generate-docx")
    public ResponseEntity<?> generateDocx(@RequestBody com.lockin.compilecv.model.resume.ResumeData resumeData) {
        try {
            byte[] docxBytes = docxService.generateDocx(resumeData);
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"resume.docx\"")
                    .body(docxBytes);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}