# ReWrite - AI Resume Optimizer

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8)

ReWrite is an intelligent resume optimization tool powered by Google Gemini AI. It helps job seekers improve their resumes for Applicant Tracking Systems (ATS) by analyzing them against specific job descriptions and providing actionable, data-driven suggestions.

![ReWrite Screenshot](https://placehold.co/1200x630/e2e8f0/1e293b?text=ReWrite+AI+Resume+Optimizer)

## 🚀 Features

- **AI-Powered Analysis**: Uses Google Gemini 2.0 Flash for deep semantic analysis of resumes and job descriptions.
- **ATS Optimization**: Extracts and matches keywords to ensure high compatibility with Applicant Tracking Systems.
- **Smart Suggestions**: Generates specific, actionable improvements using the STAR method (Situation, Task, Action, Result).
- **Privacy First**: Resumes are processed temporarily and automatically deleted after 24 hours.
- **Modern UI**: Beautiful, responsive interface built with Next.js 14, Tailwind CSS, and framer-motion animations.
- **Secure Uploads**: Direct-to-S3 uploads using pre-signed URLs for security and performance.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **AI Engine**: Google Gemini API
- **Storage**: AWS S3
- **Text Processing**: `mammoth` (DOCX parsing), `natural` (NLP)

## 🏁 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- AWS Account (for S3)
- Google Cloud Account (for Gemini API)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/rewrite.git
   cd rewrite
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:

   ```env
   # AWS Configuration
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_S3_BUCKET_NAME=your_bucket_name

   # Google Gemini AI
   GEMINI_API_KEY=your_gemini_api_key
   ```

### AWS S3 Configuration

1. Create a new S3 bucket.
2. Configure CORS for the bucket to allow uploads from localhost:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST"],
       "AllowedOrigins": ["http://localhost:3000"],
       "ExposeHeaders": []
     }
   ]
   ```

### Running Locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🔮 Future Roadmap

### Phase 1: Essential Improvements (High Priority)

- [ ] **PDF Support**: Add parsing for PDF resumes.
- [ ] **Downloadable Resume**: Auto-generate a formatted .docx with accepted suggestions.
- [ ] **Better Error Handling**: Toast notifications and retry mechanisms.

### Phase 2: User Experience

- [ ] **User Authentication**: Save analysis history and track progress.
- [ ] **Dashboard**: Visual analytics of resume scores over time.

### Phase 3: Advanced Features

- [ ] **Cover Letter Generator**: Create tailored cover letters based on resume + JD.
- [ ] **Resume Templates**: ATS-friendly exportable templates.
- [ ] **Interview Prep**: Generate interview questions based on the job description.

## 📄 License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.
