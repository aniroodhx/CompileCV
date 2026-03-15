import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import mammoth from "mammoth";
import crypto from "crypto";
import {
  extractJDKeywords,
  runGeminiResumeAnalysis,
  buildKeywordSuggestion,
  Suggestion,
  Analysis,
} from "@/lib/analyzers/resumeAnalyzer";

// PDF parsing temporarily disabled
// const pdfParse = require("pdf-parse");

// Initialize S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const analysisCache = new Map<string, { timestamp: number; payload: unknown }>();

// Download file from S3 and convert to text
async function getFileFromS3(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3.send(command);
  const arrayBuffer = await response.Body?.transformToByteArray();

  if (!arrayBuffer) {
    throw new Error("Failed to download file from S3");
  }

  const fileType = key.toLowerCase().split(".").pop();

  if (fileType === "pdf") {
    throw new Error("PDF parsing is currently not supported. Please upload a DOCX file.");
  }

  if (fileType === "docx" || fileType === "doc") {
    try {
      const buffer = Buffer.from(arrayBuffer);
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error("Error parsing DOCX:", error);
      throw new Error("Failed to parse DOCX");
    }
  }

  console.error("Unsupported file type:", fileType);
  throw new Error("Unsupported file type");
}

function getCacheKey(resumeKey: string, jobDescription: string): string {
  return crypto.createHash("sha256").update(`${resumeKey}|${jobDescription}`).digest("hex");
}

function getCachedPayload(key: string) {
  const cached = analysisCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    analysisCache.delete(key);
    return null;
  }
  return cached.payload;
}

function setCachePayload(key: string, payload: unknown) {
  analysisCache.set(key, { timestamp: Date.now(), payload });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resumeKey, jobDescription } = body;

    if (!resumeKey || !jobDescription) {
      return NextResponse.json({ error: "Resume and JD are required" }, { status: 400 });
    }

    const cacheKey = getCacheKey(resumeKey, jobDescription);
    const cached = getCachedPayload(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const resumeText = await getFileFromS3(resumeKey);
    const jdKeywords = extractJDKeywords(jobDescription);
    const resumeLower = resumeText.toLowerCase();

    const keywordMatches: string[] = [];
    const missingKeywords: string[] = [];

    jdKeywords.forEach((keyword) => {
      if (resumeLower.includes(keyword.toLowerCase())) {
        keywordMatches.push(keyword);
      } else {
        missingKeywords.push(keyword);
      }
    });

    const aiResult = await runGeminiResumeAnalysis(resumeText, jobDescription, missingKeywords);

    const suggestions: Suggestion[] = aiResult.suggestions.map((suggestion, index) => ({
      id: `suggestion-${index + 1}`,
      ...suggestion,
    }));

    const groupedKeywordSuggestion = buildKeywordSuggestion(missingKeywords);
    if (groupedKeywordSuggestion) {
      suggestions.push({
        id: `suggestion-${suggestions.length + 1}`,
        ...groupedKeywordSuggestion,
      });
    }

    const analysis: Analysis = {
      matchScore: aiResult.matchScore,
      keywordMatches,
      missingKeywords,
      weakPhrases: aiResult.weakPhrases,
      strengths: aiResult.strengths,
    };

    const payload = {
      resumeText,
      analysis,
      suggestions,
      score: analysis.matchScore,
    };

    setCachePayload(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error processing resume and JD:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}