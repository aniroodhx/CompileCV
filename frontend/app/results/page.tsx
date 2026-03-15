"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// --- Interfaces matching Backend DTOs ---

export interface Suggestion {
  id: string;
  type: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

interface BulletPoint {
  original: string;
  improved: string;
  accepted: boolean;
}

interface Experience {
  title: string;
  company: string;
  date: string;
  location: string;
  summary: string;
  bulletPoints: BulletPoint[];
}

interface Project {
  title: string;
  link: string;
  date: string;
  summary: string;
  location: string;
  bulletPoints: BulletPoint[];
}

interface ResumeData {
  personalInfo: any;
  education: any[];
  skills: any;
  experience: Experience[];
  projects: Project[];
}

interface ProcessedResume {
  analysis: {
    matchScore: number;
    strengths: string[];
    missingKeywords: string[];
    matchKeywords?: string[];
    jdKeywords?: string[];
    addedKeywords?: string[];
    originalMatchKeywords?: string[];
  };
  suggestions: Suggestion[];
  resumeData: ResumeData;
}

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProcessedResume | null>(null);

  // PDF State
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Ref to prevent double-fetching in Strict Mode
  const processedRef = useRef(false);

  useEffect(() => {
    const resumeKey = searchParams.get("resumeKey");
    const jd = searchParams.get("jd");

    if (!resumeKey || !jd) {
      setError("Missing required parameters");
      setLoading(false);
      return;
    }

    // Prevent double execution
    if (processedRef.current) return;
    processedRef.current = true;

    processResume(resumeKey, jd);
  }, [searchParams]);

  // Initial Processing
  const processResume = async (resumeKey: string, jobDescription: string) => {
    try {
      const response = await fetch("http://localhost:8080/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeKey, jobDescription }),
      });

      if (!response.ok) throw new Error("Failed to process resume");

      const result: ProcessedResume = await response.json();

      // --- DETERMINISTIC BASELINE CALCULATION ---
      // We ignore the AI's partial/fuzzy keyword lists to ensure 100% consistency
      // with our frontend toggle logic.

      const jdKeywords = result.analysis.jdKeywords || [];

      // 1. Construct Original Text (Strictly from original bullets)
      const originalText = getAllOriginalResumeText(
        result.resumeData
      ).toLowerCase();

      // 2. Calculate Strict Matches (Using Helper)
      // Note: We need to define the helper before using (or hoist).
      // Since hasKeyword is defined below, ensure we can access it or duplicate logic here.
      // For safety in this functional component scope, we'll inline the logic or rely on the function hoisting if defined as `function`
      // but here it is const. We should move `hasKeyword` to module scope or inside existing scope.
      // Let's rely on moving `hasKeyword` to outside the component or duplicating the simple logic here to be safe within `processResume`.

      const checkKeyword = (text: string, keyword: string): boolean => {
        const isAlphanumeric = /^[a-zA-Z0-9\s]+$/.test(keyword);
        if (!isAlphanumeric) return text.includes(keyword.toLowerCase());
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`\\b${escaped}\\b`, "i").test(text);
      };

      const deterministicMatches = jdKeywords.filter((k) =>
        checkKeyword(originalText, k)
      );

      // 3. Calculate Strict Missing
      const deterministicMissing = jdKeywords.filter(
        (k) => !deterministicMatches.includes(k)
      );

      // 4. Overwrite Analysis State with Deterministic Values
      result.analysis.matchKeywords = deterministicMatches;
      result.analysis.originalMatchKeywords = [...deterministicMatches]; // Immutable Baseline
      result.analysis.missingKeywords = deterministicMissing;
      result.analysis.addedKeywords = []; // Initially empty as we start with original state

      // 5. Recalculate Score to match our strict accounting
      if (jdKeywords.length > 0) {
        result.analysis.matchScore = Math.round(
          (deterministicMatches.length / jdKeywords.length) * 100
        );
      }

      console.log(
        "--- KEYWORD MATCH VERIFICATION (Frontend Deterministic) ---"
      );
      console.log("JD Keywords:", jdKeywords.length, jdKeywords);
      console.log(
        "Original Matches:",
        deterministicMatches.length,
        deterministicMatches
      );
      console.log(
        "Missing:",
        deterministicMissing.length,
        deterministicMissing
      );
      console.log("Score:", result.analysis.matchScore);
      console.log("----------------------------------");

      setData(result);
      setLoading(false);

      // Generate initial PDF (Original)
      generatePdf(result.resumeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setLoading(false);
    }
  };

  // Helper to extract strictly ORIGINAL text
  const getAllOriginalResumeText = (data: ResumeData): string => {
    let text = "";
    if (data.skills) {
      text += `${data.skills.languages || ""} ${data.skills.frameworks || ""} ${
        data.skills.tools || ""
      } `;
    }
    data.experience?.forEach((exp) => {
      text += `${exp.title} ${exp.company} ${exp.summary || ""} `;
      exp.bulletPoints?.forEach((bp) => {
        text += bp.original + " ";
      });
    });
    data.projects?.forEach((proj) => {
      text += `${proj.title} ${proj.summary || ""} `;
      proj.bulletPoints?.forEach((bp) => {
        text += bp.original + " ";
      });
    });
    return text;
  };

  // Generate PDF from current ResumeData state
  const generatePdf = async (resumeData: ResumeData) => {
    setPdfLoading(true);
    try {
      const response = await fetch("http://localhost:8080/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resumeData),
      });

      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      console.error("PDF Generation failed", err);
    } finally {
      setPdfLoading(false);
    }
  };

  // Refactored Recalculation Logic
  const recalculateAnalysis = (newData: ProcessedResume) => {
    const currentText = getAllResumeText(newData.resumeData).toLowerCase();

    // 1. Recalculate Matches with Regex
    const jdKeywords = newData.analysis.jdKeywords || [];
    const currentMatches = jdKeywords.filter((k) => hasKeyword(currentText, k));

    // 2. Recalculate Missing
    const currentMissing = jdKeywords.filter(
      (k) => !currentMatches.includes(k)
    );

    // 3. Recalculate Added
    const originalMatchesSet = new Set(
      (newData.analysis.originalMatchKeywords || []).map((k) => k.toLowerCase())
    );
    const currentAdded = currentMatches.filter(
      (k) => !originalMatchesSet.has(k.toLowerCase())
    );

    // Update Analysis State
    newData.analysis.missingKeywords = currentMissing;
    newData.analysis.addedKeywords = currentAdded;
    newData.analysis.matchKeywords = currentMatches;

    // Recalculate Score
    if (jdKeywords.length > 0) {
      newData.analysis.matchScore = Math.round(
        (currentMatches.length / jdKeywords.length) * 100
      );
    }
  };

  // Toggle ALL Inputs
  const toggleAll = (accepted: boolean) => {
    if (!data) return;
    const newData = { ...data };

    newData.resumeData.experience?.forEach((exp) => {
      exp.bulletPoints.forEach((bp) => (bp.accepted = accepted));
    });

    newData.resumeData.projects?.forEach((proj) => {
      proj.bulletPoints.forEach((bp) => (bp.accepted = accepted));
    });

    recalculateAnalysis(newData);
    setData(newData);
    generatePdf(newData.resumeData);
  };

  // Toggle Acceptance Logic
  const toggleAcceptance = (
    section: "experience" | "projects",
    index: number,
    bulletIndex: number,
    accepted: boolean
  ) => {
    if (!data) return;

    // Deep copy state update
    const newData = { ...data };
    const sectionList = newData.resumeData[section];
    if (sectionList && sectionList[index]) {
      sectionList[index].bulletPoints[bulletIndex].accepted = accepted;

      recalculateAnalysis(newData);

      setData(newData);
      generatePdf(newData.resumeData); // Regenerate PDF
    }
  };

  // Helper: Strict Keyword Check with Word Boundaries
  const hasKeyword = (text: string, keyword: string): boolean => {
    // If keyword contains non-word chars (like C++, .NET), fallback to simple includes
    // strict word boundaries \b only work for [a-zA-Z0-9_]
    const isAlphanumeric = /^[a-zA-Z0-9\s]+$/.test(keyword);

    if (!isAlphanumeric) {
      return text.includes(keyword.toLowerCase());
    }

    // Escape regex special characters just in case
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Regex for: boundary + keyword + boundary, case insensitive
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    return regex.test(text);
  };

  // Helper to extract all visible text from resume data
  const getAllResumeText = (data: ResumeData): string => {
    let text = "";

    // Skills
    if (data.skills) {
      text += `${data.skills.languages} ${data.skills.frameworks} ${data.skills.tools} `;
    }

    // Experience
    data.experience?.forEach((exp) => {
      text += `${exp.title} ${exp.company} ${exp.summary} `;
      exp.bulletPoints.forEach((bp) => {
        text += bp.accepted ? bp.improved : bp.original + " ";
      });
    });

    // Projects
    data.projects?.forEach((proj) => {
      text += `${proj.title} ${proj.summary} `;
      proj.bulletPoints.forEach((bp) => {
        text += bp.accepted ? bp.improved : bp.original + " ";
      });
    });

    return text;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-slate-700">
            Analyzing Resume...
          </h2>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 space-y-4">
        <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-center max-w-md mx-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-red-900 mb-2">
            Processing Failed
          </h3>
          <p className="text-red-700 mb-6">{error || "Something went wrong"}</p>
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col h-screen overflow-hidden bg-slate-100">
      {/* Top Bar: Score & Summary */}
      <header className="bg-white shadow-sm p-4 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              ReWrite
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Match Score
              </span>
              <span
                className={`text-2xl font-bold ${
                  data.analysis.matchScore >= 70
                    ? "text-green-600"
                    : data.analysis.matchScore >= 50
                    ? "text-amber-500"
                    : "text-red-500"
                }`}
              >
                {data.analysis.matchScore}/100
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-slate-500 hover:text-blue-600 font-medium"
          >
            Upload New
          </button>
        </div>
      </header>

      {/* Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Interactive Suggestions */}
        <div className="w-1/2 overflow-y-auto p-6 space-y-8 border-r border-slate-200 bg-white/50">
          {/* Analysis Summary (Accordion-like) */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              Analysis Insights
            </h3>

            {/* Strengths */}
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <h4 className="text-sm font-semibold text-green-800 mb-2">
                Strengths
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.analysis.strengths.map((s, i) => (
                  <span
                    key={i}
                    className="text-xs font-medium px-2 py-1 bg-white rounded border border-green-200 text-green-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Missing Keywords */}
            {data.analysis.missingKeywords?.length > 0 && (
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <h4 className="text-sm font-semibold text-red-800 mb-2">
                  Missing Keywords
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.analysis.missingKeywords.map((k, i) => (
                    <span
                      key={i}
                      className="text-xs font-medium px-2 py-1 bg-white rounded border border-red-200 text-red-700"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Added Keywords */}
            {(data.analysis.addedKeywords?.length ?? 0) > 0 && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">
                  Added Keywords
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.analysis.addedKeywords?.map((k, i) => (
                    <span
                      key={i}
                      className="text-xs font-medium px-2 py-1 bg-white rounded border border-blue-200 text-blue-700"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Sections */}
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Optimization</h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => toggleAll(true)}
                  variant="outline"
                  className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50"
                >
                  Accept All
                </Button>
                <Button
                  onClick={() => toggleAll(false)}
                  variant="outline"
                  className="h-8 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Reset
                </Button>
              </div>
            </div>

            {/* Experience */}
            {data.resumeData.experience?.map((exp, i) => (
              <div key={`exp-${i}`} className="space-y-4">
                <div className="flex justify-between items-baseline border-b pb-2">
                  <h4 className="font-semibold text-slate-900">
                    {exp.title}{" "}
                    <span className="text-slate-500 font-normal">
                      at {exp.company}
                    </span>
                  </h4>
                  <span className="text-xs text-slate-400">{exp.date}</span>
                </div>

                <div className="space-y-4 pl-4 border-l-2 border-slate-100">
                  {exp.bulletPoints.map((bp, j) => (
                    <div
                      key={`bp-${j}`}
                      className="bg-white p-4 rounded-xl shadow-sm border border-slate-200"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase">
                          Suggestion
                        </span>
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={bp.accepted}
                              onChange={(e) =>
                                toggleAcceptance(
                                  "experience",
                                  i,
                                  j,
                                  e.target.checked
                                )
                              }
                            />
                            <div
                              className={`block w-10 h-6 rounded-full transition-colors ${
                                bp.accepted ? "bg-green-500" : "bg-slate-300"
                              }`}
                            ></div>
                            <div
                              className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                                bp.accepted ? "transform translate-x-4" : ""
                              }`}
                            ></div>
                          </div>
                          <span className="ml-3 text-sm font-medium text-slate-600">
                            {bp.accepted ? "Accepted" : "Original"}
                          </span>
                        </label>
                      </div>

                      {/* Comparison */}
                      <div className="space-y-3">
                        <div
                          className={`p-3 rounded-lg text-sm ${
                            !bp.accepted
                              ? "bg-blue-50 border border-blue-100 text-slate-800"
                              : "text-slate-400"
                          }`}
                        >
                          <strong>Original:</strong> {bp.original}
                        </div>
                        <div
                          className={`p-3 rounded-lg text-sm ${
                            bp.accepted
                              ? "bg-green-50 border border-green-100 text-slate-800"
                              : "text-slate-400"
                          }`}
                        >
                          <strong>Improved:</strong> {bp.improved}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Projects - Similar Logic */}
            {data.resumeData.projects?.map((proj, i) => (
              <div key={`proj-${i}`} className="space-y-4">
                <div className="flex justify-between items-baseline border-b pb-2">
                  <h4 className="font-semibold text-slate-900">{proj.title}</h4>
                  <span className="text-xs text-slate-400">{proj.date}</span>
                </div>
                <div className="space-y-4 pl-4 border-l-2 border-slate-100">
                  {proj.bulletPoints.map((bp, j) => (
                    <div
                      key={`pbp-${j}`}
                      className="bg-white p-4 rounded-xl shadow-sm border border-slate-200"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase">
                          Suggestion
                        </span>
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={bp.accepted}
                              onChange={(e) =>
                                toggleAcceptance(
                                  "projects",
                                  i,
                                  j,
                                  e.target.checked
                                )
                              }
                            />
                            <div
                              className={`block w-10 h-6 rounded-full transition-colors ${
                                bp.accepted ? "bg-green-500" : "bg-slate-300"
                              }`}
                            ></div>
                            <div
                              className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                                bp.accepted ? "transform translate-x-4" : ""
                              }`}
                            ></div>
                          </div>
                        </label>
                      </div>
                      <div className="space-y-3">
                        <div
                          className={`p-3 rounded-lg text-sm ${
                            !bp.accepted
                              ? "bg-blue-50 border border-blue-100 text-slate-800"
                              : "text-slate-400"
                          }`}
                        >
                          <strong>Original:</strong> {bp.original}
                        </div>
                        <div
                          className={`p-3 rounded-lg text-sm ${
                            bp.accepted
                              ? "bg-green-50 border border-green-100 text-slate-800"
                              : "text-slate-400"
                          }`}
                        >
                          <strong>Improved:</strong> {bp.improved}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL: PDF Preview */}
        <div className="w-1/2 bg-slate-200 flex flex-col items-center justify-center p-4">
          {pdfLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="bg-white p-4 rounded-xl shadow-lg flex items-center gap-3">
                <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="font-semibold text-slate-700">
                  Updating PDF...
                </span>
              </div>
            </div>
          )}
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-lg shadow-2xl bg-white"
              title="Resume PDF Preview"
            />
          ) : (
            <div className="text-slate-500">Generating Preview...</div>
          )}
        </div>
      </div>
    </main>
  );
}
