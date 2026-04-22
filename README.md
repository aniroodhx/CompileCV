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



## License

Copyright © 2025 Anirudh S. Distributed under the MIT License. See [LICENSE](./LICENSE) for more information.
