import Groq from "groq-sdk";

// Singleton so we don't instantiate on every request
let _groq: Groq | null = null;

export function getGroqClient(): Groq {
  if (!_groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not set in environment variables");
    }
    _groq = new Groq({ apiKey });
  }
  return _groq;
}

export const GROQ_MODEL = "llama-3.3-70b-versatile";
export const GROQ_TEMPERATURE = 0.1; // Low temp = deterministic, grounded responses
export const GROQ_MAX_TOKENS = 4096;