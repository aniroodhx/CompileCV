"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
export interface Suggestion {
  id: string;
  type: string;
  originalText: string;
  suggestedText: string;
  startIndex: number;
  endIndex: number;
  reason: string;
  priority: "high" | "medium" | "low";
}

interface ProcessedResume {
  resumeText: string;
  analysis: {
    matchScore: number;
    keywordMatches: string[];
    missingKeywords: string[];
    weakPhrases: string[];
    strengths: string[];
  };
  suggestions: Suggestion[];
}

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProcessedResume | null>(null);

  // Track applied suggestions
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(
    new Set()
  );
  const [copiedSuggestionId, setCopiedSuggestionId] = useState<string | null>(
    null
  );

  // Score state to allow updates
  const [currentScore, setCurrentScore] = useState(0);

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

  const processResume = async (resumeKey: string, jobDescription: string) => {
    try {
      const response = await fetch("http://localhost:8080/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeKey,
          jobDescription,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process resume");
      }

      const result = await response.json();
      setData(result);
      setCurrentScore(result.analysis.matchScore);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, suggestionId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSuggestionId(suggestionId);
      setTimeout(() => setCopiedSuggestionId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const toggleApplied = (suggestionId: string) => {
    setAppliedSuggestions((prev) => {
      const newSet = new Set(prev);
      const isApplying = !newSet.has(suggestionId);

      if (isApplying) {
        newSet.add(suggestionId);
        // Increase score, max 100
        setCurrentScore((s) => Math.min(s + 2, 100));
      } else {
        newSet.delete(suggestionId);
        // Decrease score, min original score
        setCurrentScore((s) => Math.max(s - 2, data?.analysis.matchScore || 0));
      }

      return newSet;
    });
  };

  // Get the original text from resume for display
  const getOriginalText = (suggestion: Suggestion): string => {
    if (suggestion.originalText) {
      return suggestion.originalText;
    }
    // If no originalText, try to extract from resume text using indices
    if (suggestion.startIndex >= 0 && suggestion.endIndex >= 0 && data) {
      return data.resumeText.substring(
        suggestion.startIndex,
        suggestion.endIndex
      );
    }
    return "N/A";
  };

  if (loading) {
    return (
      <main className="min-h-screen py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 mb-6 shadow-lg">
            <svg
              className="animate-spin h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">
            Analyzing Your Resume
          </h2>
          <p className="text-slate-500">This may take a few moments...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full glass-effect rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Processing Failed
          </h2>
          <p className="text-slate-600 mb-6">
            {error || "Failed to process resume"}
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  const appliedCount = appliedSuggestions.size;

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="glass-effect rounded-2xl p-8 mb-8 shadow-xl animate-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Analysis Results
              </h1>
              <p className="text-slate-600">
                Review suggestions and optimize your resume
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
            >
              New Analysis
            </button>
          </div>

          {/* Match Score */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">
                ATS Match Score
              </span>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {currentScore}%
              </span>
            </div>
            <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out ${
                  currentScore >= 70
                    ? "bg-gradient-to-r from-green-500 to-emerald-500"
                    : currentScore >= 50
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                    : "bg-gradient-to-r from-red-500 to-pink-500"
                }`}
                style={{ width: `${currentScore}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            {appliedCount > 0 && (
              <p className="text-sm text-green-600 font-medium mt-2 flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                +{appliedCount * 2} points from applied suggestions
              </p>
            )}
          </div>

          {/* Strengths */}
          {data.analysis.strengths.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Key Strengths
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.analysis.strengths.map((strength, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-800 text-sm font-medium rounded-lg flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {strength}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Suggestions Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Optimization Suggestions
            <span className="ml-2 text-lg font-normal text-slate-500">
              ({data.suggestions.length})
            </span>
          </h2>
          <p className="text-slate-600">
            Copy suggested improvements and mark them as applied to track your
            progress
          </p>
        </div>

        {/* Suggestions List */}
        <div className="space-y-6">
          {data.suggestions.map((suggestion, index) => {
            const isApplied = appliedSuggestions.has(suggestion.id);
            const originalText = getOriginalText(suggestion);

            return (
              <div
                key={suggestion.id}
                className={`suggestion-card glass-effect rounded-2xl p-6 ${
                  isApplied
                    ? "ring-2 ring-green-400 bg-gradient-to-br from-green-50/50 to-emerald-50/50"
                    : suggestion.priority === "high"
                    ? "ring-2 ring-red-200 bg-gradient-to-br from-red-50/50 to-orange-50/50"
                    : suggestion.priority === "medium"
                    ? "ring-2 ring-yellow-200 bg-gradient-to-br from-yellow-50/50 to-orange-50/50"
                    : "ring-1 ring-slate-200"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-bold text-slate-400">
                      #{index + 1}
                    </span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-lg ${
                        suggestion.priority === "high"
                          ? "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                          : suggestion.priority === "medium"
                          ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                          : "bg-gradient-to-r from-slate-500 to-slate-600 text-white"
                      }`}
                    >
                      {suggestion.priority.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200">
                      {suggestion.type.replace("-", " ").toUpperCase()}
                    </span>
                  </div>
                  {isApplied && (
                    <div className="flex items-center gap-1 text-green-600 bg-green-100 px-3 py-1 rounded-lg">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-xs font-semibold">Applied</span>
                    </div>
                  )}
                </div>

                {/* Reason */}
                <div className="mb-4 p-3 bg-white/60 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {suggestion.reason}
                  </p>
                </div>

                {/* Original Text */}
                {originalText && originalText !== "N/A" && (
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                      Current Resume Text
                    </label>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {originalText}
                      </p>
                    </div>
                  </div>
                )}

                {/* Suggested Text */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                    Optimized Suggestion
                  </label>
                  <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
                    <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap pr-20">
                      {suggestion.suggestedText}
                    </p>
                    <button
                      onClick={() =>
                        copyToClipboard(suggestion.suggestedText, suggestion.id)
                      }
                      className={`absolute top-3 right-3 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                        copiedSuggestionId === suggestion.id
                          ? "bg-green-500 text-white shadow-lg scale-105"
                          : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
                      }`}
                    >
                      {copiedSuggestionId === suggestion.id ? (
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Copied!
                        </span>
                      ) : (
                        "Copy"
                      )}
                    </button>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => toggleApplied(suggestion.id)}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                      isApplied
                        ? "bg-green-100 text-green-700 border-2 border-green-300 hover:bg-green-200"
                        : "bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:from-slate-800 hover:to-slate-900 shadow-lg hover:shadow-xl"
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Applied to Resume
                      </>
                    ) : (
                      "Mark as Applied"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {data.suggestions.length === 0 && (
          <div className="glass-effect rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Excellent Resume!
            </h3>
            <p className="text-slate-600">
              Your resume is well-optimized for this job description.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
