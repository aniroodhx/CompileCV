import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReWrite - AI Resume Optimizer",
  description: "Transform your resume with AI-powered suggestions. Optimize for ATS and stand out to recruiters.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
