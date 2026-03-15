"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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

interface Certification {
  name: string;
  issuer: string;
}

interface ResumeData {
  personalInfo: any;
  education: any[];
  skills: any;
  experience: Experience[];
  projects: Project[];
  certifications: Certification[];
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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProcessedResume | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const processedRef = useRef(false);

  const getLiveScore = (analysis: ProcessedResume["analysis"]): number => {
    const jdLen = analysis.jdKeywords?.length ?? 0;
    const matchLen = analysis.matchKeywords?.length ?? 0;
    if (jdLen > 0) return Math.round((matchLen / jdLen) * 100);
    return analysis.matchScore;
  };

  const normalizeText = (text: string): string => {
    return text
      .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };

  const hasKeyword = (resumeText: string, keyword: string): boolean => {
    const normKeyword = normalizeText(keyword);
    const normText = normalizeText(resumeText);
    if (!normKeyword) return false;
    if (normKeyword.includes(" ")) {
      if (normText.includes(normKeyword)) return true;
      const words = normKeyword.split(" ").filter((w) => w.length > 0);
      return words.every((w) => {
        const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const isAlpha = /^[a-z]+$/.test(w);
        return isAlpha
          ? new RegExp(`\\b${escaped}\\b`).test(normText)
          : normText.includes(w);
      });
    }
    const escaped = normKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const isAlphanumeric = /^[a-z0-9]+$/.test(normKeyword);
    return isAlphanumeric
      ? new RegExp(`\\b${escaped}\\b`).test(normText)
      : normText.includes(normKeyword);
  };

  const getAllResumeText = (data: ResumeData): string => {
    const parts: string[] = [];
    if (data.skills) {
      Object.values(data.skills).forEach((v) => {
        if (typeof v === "string") parts.push(v);
        else if (Array.isArray(v)) parts.push(v.join(" "));
      });
    }
    data.education?.forEach((edu) => {
      parts.push(edu.school || "", edu.degree || "", edu.relevantCoursework || "", edu.fieldOfStudy || "");
    });
    data.experience?.forEach((exp) => {
      parts.push(exp.title, exp.company, exp.summary || "");
      exp.bulletPoints.forEach((bp) => {
        parts.push(bp.accepted ? bp.improved : bp.original);
      });
    });
    data.projects?.forEach((proj) => {
      parts.push(proj.title, proj.summary || "");
      proj.bulletPoints.forEach((bp) => {
        parts.push(bp.accepted ? bp.improved : bp.original);
      });
    });
    data.certifications?.forEach((cert) => {
      parts.push(cert.name || "", cert.issuer || "");
    });
    return parts.join(" ");
  };

  // Recalculate only runs when user toggles bullets — at that point the improved
  // text literally contains the keyword strings Gemini wove in, so hasKeyword works.
  const recalculateAnalysis = (newData: ProcessedResume) => {
    const currentText = getAllResumeText(newData.resumeData);
    const jdKeywords = newData.analysis.jdKeywords || [];
    const originalMatchSet = new Set(
      (newData.analysis.originalMatchKeywords || []).map((k) => normalizeText(k))
    );

    const currentMatches = jdKeywords.filter((k) => {
      // A keyword counts as matched if Gemini originally matched it OR it now appears in text
      return originalMatchSet.has(normalizeText(k)) || hasKeyword(currentText, k);
    });

    const currentMissing = jdKeywords.filter((k) => !currentMatches.includes(k));
    const currentAdded = currentMatches.filter((k) => !originalMatchSet.has(normalizeText(k)));

    newData.analysis.matchKeywords = currentMatches;
    newData.analysis.missingKeywords = currentMissing;
    newData.analysis.addedKeywords = currentAdded;
  };

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

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const raw = sessionStorage.getItem("resumeResult");
    if (!raw) {
      setError("No resume data found. Please go back and upload again.");
      setLoading(false);
      return;
    }

    try {
      const result: ProcessedResume = JSON.parse(raw);
      sessionStorage.removeItem("resumeResult");

      // Trust Gemini's semantic matching — it already ran deterministic matching
      // server-side. Client-side string matching fails for semantic keywords like
      // "Web applications" that don't appear verbatim in the resume.
      result.analysis.originalMatchKeywords = [...(result.analysis.matchKeywords || [])];
      result.analysis.addedKeywords = [];
      // missingKeywords already correct from Gemini

      if (process.env.NODE_ENV === "development") {
        console.log("JD Keywords:", result.analysis.jdKeywords);
        console.log("Gemini matched:", result.analysis.matchKeywords);
        console.log("Missing:", result.analysis.missingKeywords);
        console.log("Score:", result.analysis.matchScore);
      }

      // Enable all improvements by default
      result.resumeData.experience?.forEach((exp) => {
        exp.bulletPoints?.forEach((bp) => (bp.accepted = true));
      });
      result.resumeData.projects?.forEach((proj) => {
        proj.bulletPoints?.forEach((bp) => (bp.accepted = true));
      });

      recalculateAnalysis(result);

      setData(result);
      setLoading(false);
      generatePdf(result.resumeData);
    } catch {
      setError("Failed to parse resume data.");
      setLoading(false);
    }
  }, []);

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

  const toggleAcceptance = (
    section: "experience" | "projects",
    index: number,
    bulletIndex: number,
    accepted: boolean
  ) => {
    if (!data) return;
    const newData = { ...data };
    const sectionList = newData.resumeData[section];
    if (sectionList && sectionList[index]) {
      sectionList[index].bulletPoints[bulletIndex].accepted = accepted;
      recalculateAnalysis(newData);
      setData(newData);
      generatePdf(newData.resumeData);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-slate-700">Analyzing Resume...</h2>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 space-y-4">
        <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-center max-w-md mx-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-red-900 mb-2">Processing Failed</h3>
          <p className="text-red-700 mb-6">{error || "Something went wrong"}</p>
          <Button onClick={() => router.push("/")} variant="outline" className="border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const liveScore = getLiveScore(data.analysis);

  return (
    <main className="min-h-screen flex flex-col h-screen overflow-hidden bg-slate-100">
      <header className="bg-white shadow-sm p-4 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">CompileCV</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Match Score</span>
              <div className="relative group cursor-help">
                <span className={`text-2xl font-bold ${
                  liveScore >= 70 ? "text-green-600" :
                  liveScore >= 50 ? "text-amber-500" : "text-red-500"
                }`}>
                  {liveScore}/100
                </span>
                <div className="absolute left-1/2 -translate-x-1/2 top-8 w-56 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20 text-center shadow-lg">
                  {data.analysis.matchKeywords?.length ?? 0} of {data.analysis.jdKeywords?.length ?? 0} keywords matched
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => router.push("/")} className="text-sm text-slate-500 hover:text-blue-600 font-medium">
            Upload New
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-1/2 overflow-y-auto p-6 space-y-8 border-r border-slate-200 bg-white/50">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Analysis Insights</h3>

            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <h4 className="text-sm font-semibold text-green-800 mb-2">Strengths</h4>
              <div className="flex flex-wrap gap-2">
                {data.analysis.strengths.map((s, i) => (
                  <span key={i} className="text-xs font-medium px-2 py-1 bg-white rounded border border-green-200 text-green-700">{s}</span>
                ))}
              </div>
            </div>

            {data.analysis.missingKeywords?.length > 0 && (
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <h4 className="text-sm font-semibold text-red-800 mb-2">Missing Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {data.analysis.missingKeywords.map((k, i) => (
                    <span key={i} className="text-xs font-medium px-2 py-1 bg-white rounded border border-red-200 text-red-700">{k}</span>
                  ))}
                </div>
              </div>
            )}

            {(data.analysis.addedKeywords?.length ?? 0) > 0 && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">Added Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {data.analysis.addedKeywords?.map((k, i) => (
                    <span key={i} className="text-xs font-medium px-2 py-1 bg-white rounded border border-blue-200 text-blue-700">{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Optimization</h3>
              <div className="flex gap-2">
                <Button onClick={() => toggleAll(true)} variant="outline" className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50">Accept All</Button>
                <Button onClick={() => toggleAll(false)} variant="outline" className="h-8 text-xs border-slate-200 text-slate-600 hover:bg-slate-50">Reset</Button>
              </div>
            </div>

            {data.resumeData.experience?.map((exp, i) => (
              <div key={`exp-${i}`} className="space-y-4">
                <div className="flex justify-between items-baseline border-b pb-2">
                  <h4 className="font-semibold text-slate-900">{exp.title} <span className="text-slate-500 font-normal">at {exp.company}</span></h4>
                  <span className="text-xs text-slate-400">{exp.date}</span>
                </div>
                <div className="space-y-4 pl-4 border-l-2 border-slate-100">
                  {exp.bulletPoints.map((bp, j) => (
                    <div key={`bp-${j}`} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase">Suggestion</span>
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input type="checkbox" className="sr-only" checked={bp.accepted} onChange={(e) => toggleAcceptance("experience", i, j, e.target.checked)} />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${bp.accepted ? "bg-green-500" : "bg-slate-300"}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${bp.accepted ? "transform translate-x-4" : ""}`}></div>
                          </div>
                          <span className="ml-3 text-sm font-medium text-slate-600">{bp.accepted ? "Accepted" : "Original"}</span>
                        </label>
                      </div>
                      <div className="space-y-3">
                        <div className={`p-3 rounded-lg text-sm ${!bp.accepted ? "bg-blue-50 border border-blue-100 text-slate-800" : "text-slate-400"}`}>
                          <strong>Original:</strong> {bp.original}
                        </div>
                        <div className={`p-3 rounded-lg text-sm ${bp.accepted ? "bg-green-50 border border-green-100 text-slate-800" : "text-slate-400"}`}>
                          <strong>Improved:</strong> {bp.improved}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {data.resumeData.projects?.map((proj, i) => (
              <div key={`proj-${i}`} className="space-y-4">
                <div className="flex justify-between items-baseline border-b pb-2">
                  <h4 className="font-semibold text-slate-900">{proj.title}</h4>
                  <span className="text-xs text-slate-400">{proj.date}</span>
                </div>
                <div className="space-y-4 pl-4 border-l-2 border-slate-100">
                  {proj.bulletPoints.map((bp, j) => (
                    <div key={`pbp-${j}`} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase">Suggestion</span>
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input type="checkbox" className="sr-only" checked={bp.accepted} onChange={(e) => toggleAcceptance("projects", i, j, e.target.checked)} />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${bp.accepted ? "bg-green-500" : "bg-slate-300"}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${bp.accepted ? "transform translate-x-4" : ""}`}></div>
                          </div>
                        </label>
                      </div>
                      <div className="space-y-3">
                        <div className={`p-3 rounded-lg text-sm ${!bp.accepted ? "bg-blue-50 border border-blue-100 text-slate-800" : "text-slate-400"}`}>
                          <strong>Original:</strong> {bp.original}
                        </div>
                        <div className={`p-3 rounded-lg text-sm ${bp.accepted ? "bg-green-50 border border-green-100 text-slate-800" : "text-slate-400"}`}>
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
        <div className="w-1/2 bg-slate-200 flex flex-col items-center justify-center p-4 relative">
          {pdfLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="bg-white p-4 rounded-xl shadow-lg flex items-center gap-3">
                <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="font-semibold text-slate-700">Updating PDF...</span>
              </div>
            </div>
          )}
          {pdfUrl ? (
            <div className="w-full h-full flex flex-col gap-2">
              <a
                href={pdfUrl}
                download="resume.pdf"
                className="self-end px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow transition-all"
              >
                ⬇ Download PDF
              </a>
              <iframe
                src={pdfUrl}
                className="w-full flex-1 rounded-lg shadow-2xl bg-white"
                title="Resume PDF Preview"
              />
            </div>
          ) : (
            <div className="text-slate-500">Generating Preview...</div>
          )}
        </div>
      </div>
    </main>
  );
}