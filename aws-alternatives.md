# AWS to Free Alternatives Migration Guide

This document outlines all AWS resources used in the project and their free-tier alternatives.

## AWS Resources Identified

### 1. **AWS S3** (File Storage) ✅ Already Replaced

- **Current**: AWS S3 for file uploads and storage
- **Replacement**: **Vercel Blob Storage**
  - **Free Tier**: 100GB storage, 1,000GB bandwidth/month
  - **Features**: Pre-signed URLs, automatic expiration, serverless-friendly
  - **Cost**: Free for hobby projects, $0.15/GB storage after free tier

### 2. **API Gateway + AWS Lambda** (Serverless API)

- **Current**: API Gateway routes requests to Lambda functions (Python)
- **Replacement**: **Vercel Serverless Functions** (Recommended)
  - **Free Tier**:
    - 100GB-hours execution time/month
    - 1M invocations/month
    - 10-second execution limit (can use Edge Functions for longer)
  - **Benefits**:
    - Built-in with Next.js
    - Automatic HTTPS
    - No API Gateway configuration needed
    - Supports Python, Node.js, Go, etc.
  - **Alternative**: **Cloudflare Workers**
    - **Free Tier**: 100,000 requests/day, unlimited bandwidth
    - **Note**: Better for edge computing, but Next.js integration is smoother with Vercel

### 3. **AWS Lambda** (Compute)

- **Current**: Python Lambda for document processing
- **Replacement**: **Vercel Serverless Functions** (same as above)
  - Can use Python with `vercel.json` configuration
  - Or use Node.js with Python via subprocess if needed
  - **Alternative**: **Railway** (Free Tier: $5 credit/month)
  - **Alternative**: **Render** (Free Tier: 750 hours/month, spins down after inactivity)

### 4. **CloudFront / AWS Amplify Hosting** (Static Hosting)

- **Current**: S3 + CloudFront or Amplify for static React app
- **Replacement**: **Vercel Hosting** (Recommended)
  - **Free Tier**:
    - Unlimited bandwidth
    - Automatic CDN (global edge network)
    - Automatic HTTPS/SSL
    - Preview deployments
  - **Benefits**:
    - Perfect for Next.js apps
    - Zero configuration
    - Built-in CI/CD
  - **Alternative**: **Netlify**
    - **Free Tier**: 100GB bandwidth/month, 300 build minutes/month
  - **Alternative**: **Cloudflare Pages**
    - **Free Tier**: Unlimited bandwidth, unlimited requests

### 5. **AWS Cognito** (Authentication - Optional)

- **Current**: Optional authentication service
- **Replacement Options**:
  1. **Vercel Auth** (Recommended for Vercel stack)
     - **Free Tier**: Included with Vercel hosting
     - Supports multiple providers (Google, GitHub, etc.)
  2. **Clerk**
     - **Free Tier**: 10,000 MAU (Monthly Active Users)
     - Modern UI components included
  3. **NextAuth.js / Auth.js**
     - **Free Tier**: Open source, self-hosted
     - No limits, but requires your own database
  4. **Supabase Auth**
     - **Free Tier**: 50,000 MAU
     - Includes database and auth

## Recommended Stack (All Free Tier)

Since you're already using **Vercel Blob** and **Next.js**, here's the optimal free stack:

### ✅ Recommended: Full Vercel Stack

- **File Storage**: Vercel Blob ✅ (already using)
- **API/Compute**: Vercel Serverless Functions
- **Hosting**: Vercel Hosting
- **Auth** (if needed): Vercel Auth or Clerk
- **Database** (if needed): Vercel Postgres (free tier: 256MB, 60 hours/month) or Supabase (free tier: 500MB)

### Benefits:

- Everything in one platform
- Zero configuration
- Automatic deployments
- Global CDN included
- Simple billing (one provider)

## Alternative Free Stack Options

### Option 2: Netlify Stack

- **File Storage**: Netlify Blob (or Cloudinary free tier: 25GB storage)
- **API/Compute**: Netlify Functions
- **Hosting**: Netlify Hosting
- **Auth**: Netlify Identity (free tier: 1,000 users)

### Option 3: Cloudflare Stack

- **File Storage**: Cloudflare R2 (free tier: 10GB storage, unlimited egress)
- **API/Compute**: Cloudflare Workers
- **Hosting**: Cloudflare Pages
- **Auth**: Cloudflare Access (paid) or self-hosted

### Option 4: Hybrid Approach

- **Hosting**: Vercel (Next.js optimized)
- **File Storage**: Vercel Blob ✅
- **API**: Vercel Functions
- **Database**: Supabase (free tier)
- **Auth**: NextAuth.js + Supabase

## Migration Checklist

- [x] Replace S3 with Vercel Blob (already in package.json)
- [ ] Replace API Gateway → Vercel API Routes (Next.js API routes)
- [ ] Replace Lambda functions → Vercel Serverless Functions
- [ ] Replace CloudFront/Amplify → Vercel Hosting
- [ ] Update file upload flow to use Vercel Blob instead of S3 pre-signed URLs
- [ ] Update processing endpoints to use Vercel Functions
- [ ] Remove AWS SDK dependencies (boto3, @aws-sdk/client-s3, etc.)
- [ ] Add Vercel Blob SDK usage
- [ ] Update environment variables
- [ ] Test file upload/processing/download flow

## Code Changes Needed

### 1. Remove AWS Dependencies

```json
// Remove from package.json:
"@aws-sdk/client-s3": "^3.922.0",
"@aws-sdk/s3-request-presigner": "^3.922.0"
```

### 2. Update API Endpoints

- Change from Lambda handler format to Next.js API route format
- Example: `pages/api/process.ts` or `app/api/process/route.ts`

### 3. Update File Storage

- Replace S3 pre-signed URLs with Vercel Blob upload URLs
- Use `@vercel/blob` for uploads/downloads

## Free Tier Limits Summary

| Service              | Free Tier Limit                      | Notes                     |
| -------------------- | ------------------------------------ | ------------------------- |
| **Vercel Blob**      | 100GB storage, 1TB bandwidth/month   | Excellent for MVP         |
| **Vercel Functions** | 100GB-hours/month, 1M invocations    | Sufficient for processing |
| **Vercel Hosting**   | Unlimited bandwidth                  | Best for Next.js          |
| **Netlify**          | 100GB bandwidth, 300 build min/month | Good alternative          |
| **Cloudflare Pages** | Unlimited bandwidth                  | Best for static sites     |
| **Supabase**         | 500MB database, 2GB storage          | Great for auth + DB       |

## Cost Considerations

- **Vercel Hobby Plan**: Free for personal projects
- **Vercel Pro**: $20/month (if you need more resources)
- Most free tiers are sufficient for MVP/development
- Monitor usage and upgrade only when needed

## Next Steps

1. ✅ Keep Vercel Blob (already done)
2. Create Next.js API routes to replace Lambda functions
3. Deploy to Vercel (free hosting)
4. Test the complete flow
5. Remove AWS dependencies from package.json
