# ReRight / ReWrite:

A single, simple flow where the user uploads a .docx resume and a job description, we analyze them, show suggested edits (high-impact, ATS-aware), then produce an updated .docx for download. Below is a single clear plan (no options, no LinkedIn stuff) — short and actionable.

## One clear plan — high level

1. User uploads resume.docx and JD.txt/docx from a web form.
2. Backend analyzes JD → extracts key skills, keywords, role phrases, and scoring rules (ATS-friendly).
3. Backend analyzes resume → extracts sections, skills, bullets, and computes match gaps & weak phrasing.
4. Produce a short list of suggested changes (priority ordered) and an updated resume.docx with rewritten bullets and keyword-optimized lines.
5. Present suggestions + preview; user clicks Download updated resume (served from S3 pre-signed URL).
   That’s the whole UX.

## Minimal tech stack (free-tier friendly on AWS)

- Frontend: static React app (host on S3 + CloudFront or AWS Amplify Hosting free tier).
- File storage: S3 (upload original, store result temporarily).
- API: API Gateway → AWS Lambda (Python) for processing.
- Processing libs (Lambda Python): python-docx, docx2txt (optional), spaCy (small model en_core_web_sm), scikit-learn (TF-IDF / cosine), rapidfuzz (fuzzy matching).
- Resume rewrite heuristics: rule-based templates + short sentence-transformer or small local paraphraser if you want (optional). Prefer simple rule-based + templates to avoid heavy models.
- Download: S3 pre-signed URL returned to frontend.
- (Optional) Auth: none for MVP or use Cognito if you want sign-in (not required).
  All those AWS services have free-tier allotments suitable for an MVP.

## Architecture & data flow (concise)

1. Frontend → POST /upload (direct S3 pre-signed PUT recommended for large files)
2. Once both files present, frontend calls POST /process → API Gateway → Lambda.
3. Lambda: fetch files from S3, parse JD & resume, compute suggestions, generate new .docx, upload result to S3, return JSON with suggestions + pre-signed GET URL for updated file.
4. Frontend shows suggestions and “Download updated resume” button which uses the pre-signed URL.

## Concrete implementation steps (short)

1. Frontend: add file inputs for resume (.docx) and JD (.txt/.docx), and upload button. Use pre-signed S3 PUT for uploads.
2. Lambda handler (Python):

- Read JD text. Extract keywords: n-gram TF-IDF top terms, plus spaCy noun-phrases. Build JD_keywords set.
- Parse resume .docx with python-docx: split into sections (Experience, Education, Skills, Summary). Extract bullets and plain text.
- Score each resume bullet vs JD using: keyword overlap, TF-IDF cosine (vectorize JD + bullet), and fuzzy match for role phrases.
- Identify 3–8 suggestions (examples below): add keywords in skills, convert passive to action verbs, add quantifiers, move top matching bullets to top of experience, condense irrelevant bullets.
- For each suggested bullet change, produce 1–2 rewritten candidates using small templates:
- Template A (add quant): “Led X → increased Y by Z% over N months by …”
- Template B (keyword inject): “Designed and implemented <JD_keyword> to …”
- Generate updated resume.docx by replacing selected bullets and optionally appending a highlighted “ATS notes” comment section (or separate page).

3. Upload updated docx to S3, create pre-signed GET link, return JSON with: {suggestions:[...], score: 0-100, download_url: "..."}.
4. Frontend: show concise suggestions (3–8 lines), show score and download button.

## Example suggestion types (what user sees)

- “Add ‘AWS Lambda’ and ‘API Gateway’ under Skills — JD uses these exact phrases.”
- “Rewrite bullet: ‘Worked on backend’ → ‘Designed and implemented REST APIs using Python and Flask; reduced response latency by 30%.’”
- “Move the most relevant role at top of Experience for better relevance.”
- “Add metrics where possible (e.g., ‘reduced build time by 40%’).”
- “Consolidate two weak bullets into one focused achievement with KPI.”

## ATS rules & scoring (simple, effective)

- Exact keyword presence boosts score.
- Keyword proximity and section placement: keywords in Experience and Skills weight more.
- Avoid images/headers in ATS-critical sections (if image detected in resume, flag).
- Provide final match score (0–100) and a short explanation of top 3 reasons for score.

## Security & privacy (short & mandatory)

- Delete uploaded originals and generated resumes from S3 after configurable TTL (e.g., 24 hours).
- Use HTTPS for all endpoints. Use pre-signed S3 URLs for uploads/downloads (no direct file payload through Lambda).
- Display a short privacy notice: “Files processed temporarily on our servers; auto-deleted after 24 hours.”
- For production, add encryption-at-rest (S3 SSE) and optional authentication.

## Minimal file / API spec (1–2 endpoints)

- POST /get-presigned-upload — returns S3 pre-signed PUT URLs for resume & JD.
- POST /process — JSON: {resume_s3_key, jd_s3_key} -> returns {score, suggestions:[...], download_url}.

## Libraries & pseudo-dependencies

- Python: python-docx, docx2txt, spaCy (en_core_web_sm), scikit-learn, rapidfuzz, numpy, boto3.
- Frontend: React, axios or fetch.

## Testing checklist (quick)

- Upload flow: both files accepted (.docx, .txt).
- Parsing: resume sections and bullets detected correctly.
- Suggestion relevance: manual inspection on 10 sample JDs/resumes.
- Generated docx opens in Word and preserves formatting.
- S3 cleanup runs and pre-signed URLs expire.

## Deliverables for MVP

- Static React UI for upload + results page.
- Lambda-based processor with the analysis + rewrite pipeline.
- S3 storage + pre-signed URL downloads.
- README with deploy steps (CloudFormation or Serverless framework) and free-tier cost notes.

## Quick tips / constraints

- Keep rewrites conservative and avoid inventing facts (don’t add metrics unless user provided them). Where metrics are missing, show a suggestion placeholder like “[add % or number]” for the user to fill.
- Start with rule-based rewriting — it’s lightweight, explainable, and fits free-tier Lambdas. Add model-based paraphrasing later if needed.
