# CompileCV — AI-Powered ATS Resume Optimizer

![Next.js](https://img.shields.io/badge/Next.js-14-black)

![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2-green)

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

![Gemini](https://img.shields.io/badge/Gemini-3.1_Flash_Lite-orange)

CompileCV analyzes your resume against a job description using Google Gemini AI, gives you a deterministic ATS match score, suggests improved bullet points, and generates a clean one-page PDF — all with zero data persistence.

## Features

- **Deterministic ATS Scoring** — Keyword normalization, alias mapping, weighted scoring (required 70%, preferred 30%)

- **AI Bullet Rewrites** — Gemini rewrites bullet points to naturally include missing keywords

- **Live Score Updates** — Accept or reject suggestions and watch your score update in real time

- **LaTeX PDF Generation** — Offline Tectonic-based PDF generation, no third-party APIs

- **Zero Data Persistence** — Resumes parsed in-memory, never stored

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS

- **Backend**: Spring Boot 3.2, Java 21

- **AI**: Google Gemini 3.1 Flash Lite

- **PDF**: Tectonic (LaTeX)

- **Parsing**: Apache PDFBox, Apache POI

## Running Locally

## Design Decisions

**Deterministic scoring, not pure-LLM scoring.**
An earlier design choice worth narrating explicitly: the match score itself
comes from keyword normalization + weighted rules (required terms weighted
higher than preferred), not from asking an LLM "rate this resume's fit."
The tradeoff is explainability versus flexibility — a pure-LLM score can
adapt to nuance a rule-based system misses, but it can't tell a user *why*
it landed on 72% instead of 85%, and it can drift between identical runs.
Deterministic scoring means the same resume + JD pair always produces the
same score, and every point lost traces back to a specific missing or
under-weighted keyword — which is also what makes an actionable "missing
keywords" list possible at all. Gemini is still used, but scoped to what
LLMs are actually better at than rules: rewriting a bullet to naturally
include a missing keyword, where fluency and phrasing genuinely benefit
from a model rather than a template.

**Idempotency on the scoring endpoint.**
The scoring endpoint hashes (file bytes + job description) with SHA-256
and caches the result for 5 minutes. This guards against a user
double-submitting the same resume+JD pair — most commonly a slow network
causing a second click, or a client-side timeout on a request that
actually succeeded server-side. Without this, a double-submit means
re-parsing the file and re-calling Gemini a second time for input that's
byte-for-byte identical to the first — wasted latency and real API cost
for a result that was already computed.

**In-memory token bucket rate limiting, not Redis.**
The scoring endpoint is rate-limited per client IP using a token bucket
(5-request burst capacity, refilling at 5/minute) rather than the sliding-
window log this replaced. A token bucket needs only two numbers per client
(current tokens, last refill time) versus a full list of request
timestamps, and it naturally tolerates a short burst — e.g. a user
retrying after a transient parse error — without treating that burst as
abuse. This stays in-memory rather than Redis-backed because the service
runs as a single instance; Redis would be justified the moment this needs
to scale behind a load balancer with multiple instances, but isn't today.

### Backend

```bash

cd backend

mvn spring-boot:run

```

### Frontend

```bash

cd frontend

npm install

npm run dev

```

## Deployment

- **Backend**: Railway (Docker)

- **Frontend**: Vercel

open https://compile-cv.vercel.app/

## License

Copyright © 2025 Anirudh S. Distributed under the MIT License. See [LICENSE](./LICENSE) for more information.
