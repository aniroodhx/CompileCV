import natural from "natural";
import { generateText } from "@/lib/ai/geminiClient";

export interface Suggestion {
  id: string;
  type: 'keyword' | 'weak-phrase' | 'section' | 'bullet' | 'reorder' | 'missing-metric' | 'consolidate';
  originalText: string;
  suggestedText: string;
  startIndex: number;
  endIndex: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Analysis {
  matchScore: number;
  keywordMatches: string[];
  missingKeywords: string[];
  weakPhrases: string[];
  strengths: string[];
}

export interface GeminiAnalysisResult {
  matchScore: number;
  strengths: string[];
  weakPhrases: string[];
  suggestions: Omit<Suggestion, 'id'>[];
}

const TECH_KEYWORDS = new Set([
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php',
  'swift', 'kotlin', 'scala', 'r', 'matlab', 'sql', 'html', 'css', 'sass', 'less',
  'react', 'angular', 'vue', 'node.js', 'nodejs', 'express', 'django', 'flask', 'spring',
  'next.js', 'nextjs', 'nuxt', 'gatsby', 'nest', 'fastapi', 'laravel', 'rails',
  'redux', 'mobx', 'zustand', 'recoil', 'vuex', 'pinia',
  'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'cassandra', 'elasticsearch',
  'dynamodb', 'oracle', 'sqlite', 'nosql', 'sql',
  'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s', 'terraform',
  'ansible', 'jenkins', 'gitlab', 'github', 'ci/cd', 'cicd', 'devops', 'sre',
  'lambda', 'ec2', 's3', 'cloudfront', 'rds', 'vpc', 'iam',
  'git', 'jira', 'confluence', 'slack', 'webpack', 'babel', 'eslint', 'prettier',
  'jest', 'cypress', 'selenium', 'graphql', 'grpc', 'soap', 'microservices',
  'agile', 'scrum', 'kanban', 'sprint',
  'machine learning', 'ml', 'artificial intelligence', 'ai', 'deep learning',
  'data science', 'data engineering', 'big data', 'analytics', 'etl',
  'cybersecurity', 'security', 'encryption', 'authentication', 'authorization',
  'blockchain', 'cryptocurrency', 'web3', 'iot', 'ar', 'vr',
  'fullstack', 'full-stack', 'full stack', 'frontend', 'backend',
  'algorithm', 'data structure', 'system design', 'design pattern',
  'tdd', 'bdd', 'oop', 'functional programming',
  'ui/ux', 'user experience', 'user interface',
  'react native', 'flutter', 'serverless', 'containerization', 'orchestration',
  'monitoring', 'logging'
]);

function isTechKeyword(keyword: string): boolean {
  const normalized = keyword.toLowerCase().trim();
  if (TECH_KEYWORDS.has(normalized)) return true;
  const techPatterns = [/^[a-z]+\.[a-z]+$/, /^[a-z]+-[a-z]+$/, /^[a-z]+js$/, /^[a-z]+db$/];
  return [...TECH_KEYWORDS].some((term) => term.includes(normalized) || normalized.includes(term)) ||
    techPatterns.some((pattern) => pattern.test(normalized));
}

export function extractJDKeywords(jobDescription: string, topN = 20): string[] {
  const tokenizer = new natural.WordTokenizer();
  const stopwords = natural.stopwords;
  const tokens = tokenizer.tokenize(jobDescription.toLowerCase()) || [];
  const filtered = tokens.filter(
    (token) => token && token.length > 2 && !stopwords.includes(token) && !/^\d+$/.test(token)
  );

  const termFrequency: Record<string, number> = {};
  filtered.forEach((token) => {
    termFrequency[token] = (termFrequency[token] || 0) + 1;
  });

  const techKeywords: Array<[string, number]> = [];
  const nonTechKeywords: Array<[string, number]> = [];

  Object.entries(termFrequency).forEach(([term, freq]) => {
    if (isTechKeyword(term)) techKeywords.push([term, freq]);
    else nonTechKeywords.push([term, freq]);
  });

  techKeywords.sort((a, b) => b[1] - a[1]);
  nonTechKeywords.sort((a, b) => b[1] - a[1]);

  const result: string[] = [];
  const techCount = Math.min(techKeywords.length, Math.floor(topN * 0.7));
  const nonTechCount = topN - techCount;
  result.push(...techKeywords.slice(0, techCount).map(([term]) => term));
  result.push(...nonTechKeywords.slice(0, nonTechCount).map(([term]) => term));
  return result;
}

export async function runGeminiResumeAnalysis(
  resumeText: string,
  jobDescription: string,
  missingKeywords: string[]
): Promise<GeminiAnalysisResult> {
  const prompt = `You are an expert technical recruiter and resume writer.
TASK: Evaluate the resume against the job description and produce both analysis and rewrite suggestions.

RESUME (truncated to 3k chars): ${resumeText.substring(0, 3000)}
JOB DESCRIPTION (truncated to 2k chars): ${jobDescription.substring(0, 2000)}
MISSING KEYWORDS FROM RESUME: ${missingKeywords.join(', ') || 'None'}

REQUIREMENTS:
1. Provide a match score (0-100) grounded in keyword/skill alignment and impact.
2. List strengths (max 3) and weak phrases (max 5) that summarize the resume vs JD fit.
3. Provide 5-8 suggestions. Each suggestion must use STAR-style language, inject hard skills from the JD, and include concrete/placeholder metrics like "[X]%" or "[Y] users" when absent.
4. Suggestions should fall into categories: weak-phrase, keyword, missing-metric, reorder, consolidate.
5. Each suggestion must be copy-ready text for the candidate to paste elsewhere.
6. Return ONLY valid JSON with this structure:
{
  "analysis": {
    "matchScore": number,
    "strengths": ["..."],
    "weakPhrases": ["..."]
  },
  "suggestions": [
    {
      "type": "weak-phrase" | "keyword" | "missing-metric" | "reorder" | "consolidate",
      "originalText": "text from resume or empty string if new",
      "suggestedText": "rewritten line with STAR + metrics",
      "startIndex": number (or -1 if not applicable),
      "endIndex": number (or -1),
      "reason": "short explanation",
      "priority": "high" | "medium" | "low"
    }
  ]
}`;

  const aiResponse = await generateText(prompt);
  const cleaned = extractJson(aiResponse);
  const parsed = JSON.parse(cleaned);

  return {
    matchScore: parsed.analysis?.matchScore ?? 0,
    strengths: parsed.analysis?.strengths ?? [],
    weakPhrases: parsed.analysis?.weakPhrases ?? [],
    suggestions: parsed.suggestions ?? [],
  };
}

function extractJson(raw: string): string {
  let text = raw.trim();
  if (text.includes('```')) {
    const first = text.indexOf('```');
    const last = text.lastIndexOf('```');
    if (first !== -1 && last !== -1 && first !== last) {
      text = text.substring(first + 3, last).trim();
      text = text.replace(/^(json|JSON)\s*/i, '');
    }
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Gemini response missing JSON object');
  }
  return text.substring(start, end + 1);
}

export function buildKeywordSuggestion(keywords: string[]): Omit<Suggestion, 'id'> | null {
  const techKeywords = keywords.filter((keyword) => isTechKeyword(keyword));
  if (!techKeywords.length) return null;

  return {
    type: 'keyword',
    originalText: '',
    suggestedText: `Highlight or add these JD keywords in relevant sections: ${techKeywords.join(', ')}`,
    startIndex: -1,
    endIndex: -1,
    reason: 'These frequently used JD keywords are missing from the resume. Add them in context to boost ATS alignment.',
    priority: 'medium',
  };
}
