"use client";

import { useState, useRef, DragEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Home() {
  const router = useRouter();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jd, setJd] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("compilecv-dark");
    if (saved === "true") setDarkMode(true);
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("compilecv-dark", String(next));
  };
  const [loadingMessage, setLoadingMessage] = useState("Scanning resume structure...");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!processing) return;
    const steps = [
      "Scanning resume structure...",
      "Extracting technical skills...",
      "Matching against job description...",
      "Calculating ATS score...",
      "Optimizing bullet points...",
      "Generating PDF preview...",
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % steps.length;
      setLoadingMessage(steps[i]);
    }, 2500);
    return () => clearInterval(interval);
  }, [processing]);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain", "application/msword", "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Please upload .docx, .pdf, or .txt files only.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) { setError("File size must be less than 10MB"); return; }
    setResumeFile(file);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setProcessing(true);
    setLoadingMessage("Scanning resume structure...");
    try {
      if (!resumeFile) { setError("Please upload a resume file"); setProcessing(false); return; }
      if (!jd.trim()) { setError("Please enter a job description"); setProcessing(false); return; }

      const formData = new FormData();
      formData.append("file", resumeFile);
      formData.append("jobDescription", jd);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const response = await fetch(`${apiUrl}/api/process`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to process resume");
      }

      const result = await response.json();
      sessionStorage.setItem("resumeResult", JSON.stringify(result));
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setProcessing(false);
    }
  };

  const features = [
    { icon: "📊", label: "Deterministic ATS scoring", sub: "Keyword normalization + alias mapping" },
    { icon: "✍️", label: "AI bullet rewrites", sub: "Gemini weaves in missing keywords naturally" },
    { icon: "📄", label: "LaTeX PDF generation", sub: "Offline Tectonic — no third-party APIs" },
    { icon: "🔒", label: "Zero data persistence", sub: "Processed in-memory, never stored" },
  ];

  return (
    <main className={`min-h-screen flex items-center transition-colors duration-200 ${darkMode ? "bg-gray-950" : "bg-white"}`}>
      {/* Dark mode toggle — top right */}
      <button
        onClick={toggleDark}
        className={`fixed top-4 right-4 z-50 w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-yellow-300" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}
        title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {darkMode ? "☀️" : "🌙"}
      </button>
      <div className="w-full max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* LEFT: Branding + features */}
        <div className="animate-in space-y-8">
          {/* Brand */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              ATS Resume Optimizer
            </div>
            <h1 className="text-5xl font-bold leading-tight mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Compile</span>
              <span className={darkMode ? "text-gray-100" : "text-slate-800"}>CV</span>
            </h1>
            <p className="text-slate-500 text-lg leading-relaxed max-w-md">
              Match your resume to any job description with deterministic keyword scoring and AI-powered bullet rewrites.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            {features.map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-base leading-none flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{f.label}</p>
                  <p className="text-xs text-slate-400">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Form */}
        <div className="animate-in">
          <div className={`rounded-2xl p-8 shadow-2xl ${darkMode ? "bg-gray-900 border border-gray-700" : "glass-effect"}`}>

            {/* Privacy */}
            <div className="mb-6 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-blue-800"><span className="font-semibold">Privacy First:</span> Files are processed in memory and never stored.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* File upload */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resume File</Label>
                <div
                  className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 cursor-pointer
                    ${isDragging ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300 bg-white"}
                    ${resumeFile ? "border-green-400 bg-green-50" : ""}`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => !resumeFile && fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center text-center">
                    {resumeFile ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-3">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-slate-700">{resumeFile.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{(resumeFile.size / 1024).toFixed(2)} KB</p>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setResumeFile(null); }} className="mt-2 text-xs text-red-500 hover:text-red-600 font-medium">
                          Remove file
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-sm text-slate-600">Drop your resume here, or <span className="text-blue-600 font-semibold">browse</span></p>
                        <p className="text-xs text-slate-400 mt-0.5">.pdf · .docx · .txt — max 10MB</p>
                      </>
                    )}
                  </div>
                  <Input ref={fileInputRef} type="file" accept=".docx,.txt,.pdf" onChange={handleInputChange} disabled={processing} className="hidden" />
                </div>
              </div>

              {/* JD */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Job Description</Label>
                <textarea
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={8}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y transition-all text-sm ${darkMode ? "bg-gray-800 border-gray-600 text-gray-200 placeholder:text-gray-500" : "border-slate-200 bg-white text-slate-700 placeholder:text-slate-300 disabled:bg-slate-50"}`}
                  disabled={processing}
                  required
                />
                <p className={`text-xs text-right ${darkMode ? "text-gray-500" : "text-slate-400"}`}>{jd.length} chars · {jd.split(/\s+/).filter(Boolean).length} words</p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={processing || !resumeFile || !jd.trim()}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-sm">{loadingMessage}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Analyze Resume</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}