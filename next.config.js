/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features if needed
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Note: File uploads will go directly to S3, not through Next.js
  // This bodySizeLimit is for API responses, not file uploads
};

module.exports = nextConfig;
