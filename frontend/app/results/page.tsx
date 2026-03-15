"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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

  useEffect(() => {
    const resumeKey = searchParams.get("resumeKey");
    const jd = searchParams.get("jd");

    if (!resumeKey || !jd) {
      setError("Missing required parameters");
      setLoading(false);
      return;
    }

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
      setData(result);
      setLoading(false);

      // Generate initial PDF (Original)
      generatePdf(result.resumeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setLoading(false);
    }
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
      setData(newData);
      generatePdf(newData.resumeData); // Regenerate PDF
    }
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
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-red-600 font-semibold">
          {error || "Something went wrong"}
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
          </div>

          {/* Interactive Sections */}
          <div className="space-y-8">
            <h3 className="text-lg font-bold text-slate-800">Optimization</h3>

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
