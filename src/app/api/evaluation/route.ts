import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    candidateName: "Mayank Aneja",
    email: "mayank@mayankaneja.dev",
    repositoryUrl: "https://github.com/mayankaneja837/meeting_intelli",
    deployedUrl: process.env.DEPLOYED_URL ?? "https://meeting-intelli.vercel.app",
    externalIntegration: "Resend",
    features: [
      "Authentication",
      "AI Analysis",
      "Reminder Scheduler",
      "Citation Verification",
      "Overdue Detection",
      "Rate Limiting",
      "Swagger Docs",
      "Unified API Responses",
      "Request Trace IDs",
      "Input Validation",
      "Docker Support",
      "Upstash Redis Caching",
    ],
  });
}
