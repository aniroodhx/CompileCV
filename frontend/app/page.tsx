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
      "Generating preview...",
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

      const response = await fetch("http://localhost:8080/api/process", {
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

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 animate-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">CompileCV</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">Transform your resume with AI-powered suggestions. Optimize for ATS and stand out to recruiters.</p>
        </div>

        <div className="glass-effect rounded-2xl p-8 shadow-2xl animate-in">
          <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-blue-900"><span className="font-semibold">Privacy First:</span> Files are processed in memory and never stored.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="resume-file" className="text-sm font-semibold text-slate-700">Resume File</Label>
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ${isDragging ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300 bg-white"} ${resumeFile ? "border-green-400 bg-green-50" : ""}`}
                onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center text-center">
                  {resumeFile ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-slate-700 mb-1">{resumeFile.name}</p>
                      <p className="text-xs text-slate-500">{(resumeFile.size / 1024).toFixed(2)} KB</p>
                      <button type="button" onClick={() => setResumeFile(null)} className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium">Remove file</button>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-slate-700 mb-1">Drop your resume here, or{" "}
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-blue-600 hover:text-blue-700 font-semibold">browse</button>
                      </p>
                      <p className="text-xs text-slate-500">Supports .docx, .pdf, and .txt files (max 10MB)</p>
                    </>
                  )}
                </div>
                <Input ref={fileInputRef} id="resume-file" type="file" accept=".docx,.txt,.pdf" onChange={handleInputChange} disabled={processing} className="hidden" />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="jd" className="text-sm font-semibold text-slate-700">Job Description</Label>
              <textarea
                id="jd" value={jd} onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the job description here..." rows={10}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y disabled:bg-slate-50 disabled:cursor-not-allowed transition-all duration-200 bg-white text-slate-700 placeholder:text-slate-400"
                disabled={processing} required
              />
              <p className="text-xs text-slate-500">{jd.length} characters • {jd.split(/\s+/).filter(Boolean).length} words</p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 animate-in">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            <Button
              type="submit" disabled={processing || !resumeFile || !jd.trim()}
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <div className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium transition-all duration-500">{loadingMessage}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Analyze Resume</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              )}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}