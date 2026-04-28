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
  const [docxLoading, setDocxLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const processedRef = useRef(false);

  // Dark mode: load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("compilecv-dark");
    if (saved === "true") setDarkMode(true);
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("compilecv-dark", String(next));
  };

  const [liveScore, setLiveScore] = useState(0);

  const computeScore = (analysis: ProcessedResume["analysis"]): number => {
    const jdLen = analysis.jdKeywords?.length ?? 0;
    const matchLen = analysis.matchKeywords?.length ?? 0;
    if (jdLen > 0) return Math.min(100, Math.round((matchLen / jdLen) * 100));
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
        // FIX: always use original text for score calculation
        // Only use improved text if the user explicitly accepted it
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

  const countAcceptedBullets = (resumeData: ResumeData): number => {
    let count = 0;
    resumeData.experience?.forEach(exp => {
      exp.bulletPoints?.forEach(bp => { if (bp.accepted) count++; });
    });
    resumeData.projects?.forEach(proj => {
      proj.bulletPoints?.forEach(bp => { if (bp.accepted) count++; });
    });
    return count;
  };

  const recalculateAnalysis = (newData: ProcessedResume): ProcessedResume => {
    const currentText = getAllResumeText(newData.resumeData);
    const jdKeywords = newData.analysis.jdKeywords || [];
    const originalMatchSet = new Set(
      (newData.analysis.originalMatchKeywords || []).map((k) => normalizeText(k))
    );

    // Keywords matched by original resume text
    const textMatches = jdKeywords.filter((k) => {
      return originalMatchSet.has(normalizeText(k)) || hasKeyword(currentText, k);
    });

    // Count accepted bullets — each accepted suggestion covers ~1 additional keyword
    // This directly reflects the user's effort to improve their resume
    const acceptedCount = countAcceptedBullets(newData.resumeData);
    const totalBullets = (() => {
      let t = 0;
      newData.resumeData.experience?.forEach(e => { t += e.bulletPoints?.length || 0; });
      newData.resumeData.projects?.forEach(p => { t += p.bulletPoints?.length || 0; });
      return t || 1;
    })();

    // Missing keywords that accepted suggestions are expected to cover
    const missingKeywords = jdKeywords.filter((k) => !textMatches.includes(k));
    const keywordsCoveredByAccepted = missingKeywords.slice(
      0, Math.round((acceptedCount / totalBullets) * missingKeywords.length)
    );

    const currentMatches = [...new Set([...textMatches, ...keywordsCoveredByAccepted])];
    const currentMissing = jdKeywords.filter((k) => !currentMatches.includes(k));
    const currentAdded = currentMatches.filter((k) => !originalMatchSet.has(normalizeText(k)));

    const updated: ProcessedResume = {
      ...newData,
      analysis: {
        ...newData.analysis,
        matchKeywords: currentMatches,
        missingKeywords: currentMissing,
        addedKeywords: currentAdded,
      },
    };

    setLiveScore(computeScore(updated.analysis));
    return updated;
  };

  const generatePdf = async (resumeData: ResumeData) => {
    setPdfLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const response = await fetch(`${apiUrl}/api/generate-pdf`, {
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

  const downloadDocx = async () => {
    if (!data) return;
    setDocxLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const response = await fetch(`${apiUrl}/api/generate-docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.resumeData),
      });
      if (!response.ok) throw new Error("Failed to generate DOCX");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resume.docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("DOCX generation failed", err);
    } finally {
      setDocxLoading(false);
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

      result.analysis.originalMatchKeywords = [...(result.analysis.matchKeywords || [])];
      result.analysis.addedKeywords = [];

      // FIX: Do NOT auto-accept all on load.
      // Start with accepted=false so the initial score reflects the original resume.
      // The backend already returns accepted=false — preserve that.
      result.resumeData.experience?.forEach((exp) => {
        exp.bulletPoints?.forEach((bp) => (bp.accepted = false));
      });
      result.resumeData.projects?.forEach((proj) => {
        proj.bulletPoints?.forEach((bp) => (bp.accepted = false));
      });

      const updated = recalculateAnalysis(result);
      setData(updated);
      setLoading(false);
      generatePdf(result.resumeData);
    } catch {
      setError("Failed to parse resume data.");
      setLoading(false);
    }
  }, []);

  // Inject accepted missing keywords directly into skills.tools
  // This guarantees they appear verbatim in the downloaded file
  // and score correctly on re-upload — no reliance on Gemini embedding them
  const injectKeywordsIntoSkills = (resumeData: ResumeData, accepted: boolean): ResumeData => {
    if (!data) return resumeData;
    const missingKws = data.analysis.missingKeywords || [];
    if (missingKws.length === 0) return resumeData;

    const skills = resumeData.skills || { languages: "", frameworks: "", tools: "" };
    const currentTools = skills.tools || "";

    if (accepted) {
      // Add missing keywords to tools if not already there
      const toolsLower = currentTools.toLowerCase();
      const toAdd = missingKws.filter(k => !toolsLower.includes(k.toLowerCase()));
      const newTools = toAdd.length > 0
        ? currentTools + (currentTools ? ", " : "") + toAdd.join(", ")
        : currentTools;
      return { ...resumeData, skills: { ...skills, tools: newTools } };
    } else {
      // Reset — remove the injected keywords
      const missingSet = new Set(missingKws.map(k => k.toLowerCase()));
      const toolParts = currentTools.split(",").map((t: string) => t.trim());
      const filtered = toolParts.filter((t: string) => !missingSet.has(t.toLowerCase()));
      return { ...resumeData, skills: { ...skills, tools: filtered.join(", ") } };
    }
  };

  const toggleAll = (accepted: boolean) => {
    if (!data) return;
    const updatedResumeData = injectKeywordsIntoSkills({
      ...data.resumeData,
      experience: data.resumeData.experience?.map(exp => ({
        ...exp,
        bulletPoints: exp.bulletPoints.map(bp => ({ ...bp, accepted }))
      })),
      projects: data.resumeData.projects?.map(proj => ({
        ...proj,
        bulletPoints: proj.bulletPoints.map(bp => ({ ...bp, accepted }))
      })),
    }, accepted);

    // When resetting, restore original match keywords so score resets correctly
    const resetAnalysis = !accepted ? {
      ...data.analysis,
      matchKeywords: [...(data.analysis.originalMatchKeywords || [])],
      missingKeywords: (data.analysis.jdKeywords || []).filter(
        k => !(data.analysis.originalMatchKeywords || [])
          .map(m => m.toLowerCase()).includes(k.toLowerCase())
      ),
      addedKeywords: [],
    } : data.analysis;

    const newData: ProcessedResume = {
      ...data,
      analysis: resetAnalysis,
      resumeData: updatedResumeData,
    };
    const updated = recalculateAnalysis(newData);
    setData(updated);
    generatePdf(updated.resumeData);
  };

  const toggleAcceptance = (
    section: "experience" | "projects",
    index: number,
    bulletIndex: number,
    accepted: boolean
  ) => {
    if (!data) return;
    const sectionItems = data.resumeData[section];
    if (!sectionItems || !sectionItems[index]) return;

    const updatedSection = sectionItems.map((item: any, i: number) => {
      if (i !== index) return item;
      return {
        ...item,
        bulletPoints: item.bulletPoints.map((bp: any, j: number) =>
          j === bulletIndex ? { ...bp, accepted } : bp
        ),
      };
    });

    const newData: ProcessedResume = {
      ...data,
      resumeData: {
        ...data.resumeData,
        [section]: updatedSection,
      },
    };

    // Check if all bullets are now accepted — if so, inject keywords
    const allAccepted = [
      ...(newData.resumeData.experience?.flatMap(e => e.bulletPoints) || []),
      ...(newData.resumeData.projects?.flatMap(p => p.bulletPoints) || []),
    ].every(bp => bp.accepted);

    const finalResumeData = injectKeywordsIntoSkills(newData.resumeData, allAccepted);
    const finalData: ProcessedResume = { ...newData, resumeData: finalResumeData };
    const updated = recalculateAnalysis(finalData);
    setData(updated);
    generatePdf(updated.resumeData);
  };

  // Dark mode class helpers
  const d = darkMode;
  const bg = d ? "bg-gray-950" : "bg-slate-100";
  const headerBg = d ? "bg-gray-900 border-gray-800" : "bg-white";
  const panelBg = d ? "bg-gray-900 border-gray-800" : "bg-white/50 border-slate-200";
  const cardBg = d ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200";
  const text = d ? "text-gray-100" : "text-slate-800";
  const subtext = d ? "text-gray-400" : "text-slate-500";

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${d ? "bg-gray-950" : "bg-slate-50"}`}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className={`text-xl font-semibold ${d ? "text-gray-200" : "text-slate-700"}`}>Analyzing Resume...</h2>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen ${d ? "bg-gray-950" : "bg-slate-50"} space-y-4`}>
        <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-center max-w-md mx-4">
          <h3 className="text-lg font-bold text-red-900 mb-2">Processing Failed</h3>
          <p className="text-red-700 mb-6">{error || "Something went wrong"}</p>
          <Button onClick={() => router.push("/")} variant="outline">Try Again</Button>
        </div>
      </div>
    );
  }

  const acceptedCount = [
    ...(data.resumeData.experience?.flatMap(e => e.bulletPoints) || []),
    ...(data.resumeData.projects?.flatMap(p => p.bulletPoints) || []),
  ].filter(bp => bp.accepted).length;

  return (
    <main className={`min-h-screen flex flex-col ${bg} transition-colors duration-200`}>
      {/* Header */}
      <header className={`${headerBg} shadow-sm p-5 z-10 border-b`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Compile</span>
              <span className={d ? "text-gray-100" : "text-slate-800"}>CV</span>
            </h1>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold uppercase tracking-wide ${subtext}`}>Match Score</span>
              <div className="relative group cursor-help">
                <span className={`text-2xl font-bold ${
                  liveScore >= 70 ? "text-green-500" :
                  liveScore >= 50 ? "text-amber-500" : "text-red-500"
                }`}>
                  {liveScore}/100
                </span>
                <div className="absolute left-1/2 -translate-x-1/2 top-8 w-56 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20 text-center shadow-lg">
                  {data.analysis.matchKeywords?.length ?? 0} of {data.analysis.jdKeywords?.length ?? 0} keywords matched
                  {acceptedCount > 0 && <div className="mt-1 text-blue-300">{acceptedCount} suggestion{acceptedCount > 1 ? "s" : ""} accepted</div>}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${d ? "bg-gray-700 hover:bg-gray-600 text-yellow-300" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}
              title={d ? "Switch to light mode" : "Switch to dark mode"}
            >
              {d ? "☀️" : "🌙"}
            </button>
            <button onClick={() => router.push("/")} className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${d ? "text-gray-300 hover:text-blue-400 hover:bg-gray-800" : "text-slate-600 hover:text-blue-600 hover:bg-slate-100"}`}>
              Upload New
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row" style={{ height: "calc(100vh - 73px)" }}>
        {/* LEFT PANEL */}
        <div className={`w-full lg:w-1/2 overflow-y-auto p-6 space-y-8 border-r ${panelBg}`} style={{ height: 'calc(100vh - 73px)' }}>
          {/* Analysis */}
          <div className="space-y-4">
            <h3 className={`text-lg font-bold ${text}`}>Analysis Insights</h3>

            <div className={`p-4 rounded-xl border ${d ? "bg-green-950 border-green-800" : "bg-green-50 border-green-100"}`}>
              <h4 className={`text-sm font-semibold mb-2 ${d ? "text-green-400" : "text-green-800"}`}>Strengths</h4>
              <div className="flex flex-wrap gap-2">
                {data.analysis.strengths.map((s, i) => (
                  <span key={i} className={`text-xs font-medium px-2 py-1 rounded border ${d ? "bg-gray-800 border-green-700 text-green-300" : "bg-white border-green-200 text-green-700"}`}>{s}</span>
                ))}
              </div>
            </div>

            {data.analysis.missingKeywords?.length > 0 && (
              <div className={`p-4 rounded-xl border ${d ? "bg-red-950 border-red-800" : "bg-red-50 border-red-100"}`}>
                <h4 className={`text-sm font-semibold mb-2 ${d ? "text-red-400" : "text-red-800"}`}>
                  Missing Keywords <span className={`font-normal text-xs ml-1 ${d ? "text-red-500" : "text-red-500"}`}>(accept suggestions to improve score)</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.analysis.missingKeywords.map((k, i) => (
                    <span key={i} className={`text-xs font-medium px-2 py-1 rounded border ${d ? "bg-gray-800 border-red-700 text-red-300" : "bg-white border-red-200 text-red-700"}`}>{k}</span>
                  ))}
                </div>
              </div>
            )}

            {(data.analysis.addedKeywords?.length ?? 0) > 0 && (
              <div className={`p-4 rounded-xl border ${d ? "bg-blue-950 border-blue-800" : "bg-blue-50 border-blue-100"}`}>
                <h4 className={`text-sm font-semibold mb-2 ${d ? "text-blue-400" : "text-blue-800"}`}>Added by Accepted Suggestions</h4>
                <div className="flex flex-wrap gap-2">
                  {data.analysis.addedKeywords?.map((k, i) => (
                    <span key={i} className={`text-xs font-medium px-2 py-1 rounded border ${d ? "bg-gray-800 border-blue-700 text-blue-300" : "bg-white border-blue-200 text-blue-700"}`}>{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className={`text-lg font-bold ${text}`}>Optimization</h3>
              <div className="flex gap-2">
                <Button onClick={() => toggleAll(true)} variant="outline" className={`h-8 text-xs ${d ? "border-green-700 text-green-400 hover:bg-green-950" : "border-green-200 text-green-700 hover:bg-green-50"}`}>Accept All</Button>
                <Button onClick={() => toggleAll(false)} variant="outline" className={`h-8 text-xs ${d ? "border-gray-600 text-gray-400 hover:bg-gray-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Reset</Button>
              </div>
            </div>

            {data.resumeData.experience?.map((exp, i) => (
              <div key={`exp-${i}`} className="space-y-4">
                <div className={`flex justify-between items-baseline border-b pb-2 ${d ? "border-gray-700" : ""}`}>
                  <h4 className={`font-semibold ${text}`}>{exp.title} <span className={`font-normal ${subtext}`}>at {exp.company}</span></h4>
                  <span className={`text-xs ${subtext}`}>{exp.date}</span>
                </div>
                <div className={`space-y-4 pl-4 border-l-2 ${d ? "border-gray-700" : "border-slate-100"}`}>
                  {exp.bulletPoints.map((bp, j) => (
                    <div key={`bp-${j}`} className={`p-4 rounded-xl shadow-sm border ${cardBg}`}>
                      <div className="flex justify-between items-center mb-3">
                        <span className={`text-xs font-bold uppercase ${subtext}`}>Suggestion</span>
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input type="checkbox" className="sr-only" checked={bp.accepted} onChange={(e) => toggleAcceptance("experience", i, j, e.target.checked)} />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${bp.accepted ? "bg-green-500" : d ? "bg-gray-600" : "bg-slate-300"}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${bp.accepted ? "transform translate-x-4" : ""}`}></div>
                          </div>
                          <span className={`ml-3 text-sm font-medium ${subtext}`}>{bp.accepted ? "Accepted" : "Original"}</span>
                        </label>
                      </div>
                      <div className="space-y-3">
                        <div className={`p-3 rounded-lg text-sm ${!bp.accepted ? (d ? "bg-blue-950 border border-blue-800 text-gray-200" : "bg-blue-50 border border-blue-100 text-slate-800") : (d ? "text-gray-600" : "text-slate-400")}`}>
                          <strong>Original:</strong> {bp.original}
                        </div>
                        <div className={`p-3 rounded-lg text-sm ${bp.accepted ? (d ? "bg-green-950 border border-green-800 text-gray-200" : "bg-green-50 border border-green-100 text-slate-800") : (d ? "text-gray-600" : "text-slate-400")}`}>
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
                <div className={`flex justify-between items-baseline border-b pb-2 ${d ? "border-gray-700" : ""}`}>
                  <h4 className={`font-semibold ${text}`}>{proj.title}</h4>
                  <span className={`text-xs ${subtext}`}>{proj.date}</span>
                </div>
                <div className={`space-y-4 pl-4 border-l-2 ${d ? "border-gray-700" : "border-slate-100"}`}>
                  {proj.bulletPoints.map((bp, j) => (
                    <div key={`pbp-${j}`} className={`p-4 rounded-xl shadow-sm border ${cardBg}`}>
                      <div className="flex justify-between items-center mb-3">
                        <span className={`text-xs font-bold uppercase ${subtext}`}>Suggestion</span>
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input type="checkbox" className="sr-only" checked={bp.accepted} onChange={(e) => toggleAcceptance("projects", i, j, e.target.checked)} />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${bp.accepted ? "bg-green-500" : d ? "bg-gray-600" : "bg-slate-300"}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${bp.accepted ? "transform translate-x-4" : ""}`}></div>
                          </div>
                          <span className={`ml-3 text-sm font-medium ${subtext}`}>{bp.accepted ? "Accepted" : "Original"}</span>
                        </label>
                      </div>
                      <div className="space-y-3">
                        <div className={`p-3 rounded-lg text-sm ${!bp.accepted ? (d ? "bg-blue-950 border border-blue-800 text-gray-200" : "bg-blue-50 border border-blue-100 text-slate-800") : (d ? "text-gray-600" : "text-slate-400")}`}>
                          <strong>Original:</strong> {bp.original}
                        </div>
                        <div className={`p-3 rounded-lg text-sm ${bp.accepted ? (d ? "bg-green-950 border border-green-800 text-gray-200" : "bg-green-50 border border-green-100 text-slate-800") : (d ? "text-gray-600" : "text-slate-400")}`}>
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
        <div className={`w-full lg:w-1/2 ${d ? "bg-gray-800" : "bg-slate-200"} flex flex-col p-4 sticky top-0`} style={{ height: 'calc(100vh - 73px)' }}>
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
              {/* Download buttons */}
              <div className="flex gap-2 self-end">
                <a
                  href={pdfUrl}
                  download="resume.pdf"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow transition-all"
                >
                  ⬇ Download PDF
                </a>
                <button
                  onClick={downloadDocx}
                  disabled={docxLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow transition-all flex items-center gap-1.5"
                >
                  {docxLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </>
                  ) : "⬇ Download DOCX"}
                </button>
              </div>
              <iframe
                src={pdfUrl}
                className="w-full flex-1 rounded-lg shadow-2xl bg-white"
                title="Resume PDF Preview"
              />
            </div>
          ) : (
            <div className={subtext}>Generating Preview...</div>
          )}
        </div>
      </div>
    </main>
  );
}