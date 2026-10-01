import { GoogleGenAI } from "@google/genai";

// Server-side only. Never import this into a "use client" component.
// Swapped from Anthropic to Google Gemini (mentor-approved) because of
// an Anthropic billing/credits blocker.
export const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// gemini-3.8-flash (the newest flagship) has a very tight free-tier
// quota (5 requests/minute) — too low for a batch of classification
// calls. gemini-3.1-flash-lite is Google's high-volume, cost-sensitive
// tier and gets a much more usable free-tier allowance, which is what
// this project actually needs (many small classification calls rather
// than a few large ones).
export const MODEL = "gemini-3.1-flash-lite";

export function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes('"status":"UNAVAILABLE"') || // 503, temporary overload
    message.includes('"code":503') ||
    message.includes('"status":"RESOURCE_EXHAUSTED"') || // 429, rate limit
    message.includes('"code":429')
  );
}

// Google's 429 errors include the exact wait time it wants, e.g.
// "Please retry in 54.552747228s." or a structured retryDelay: "54s" —
// honor that instead of guessing with a fixed backoff.
function extractRetryDelayMs(err: unknown): number | null {
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/"retryDelay":"(\d+)s"/) ?? message.match(/retry in (\d+(?:\.\d+)?)s/);
  if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 500; // small buffer
  return null;
}

/**
 * Calls Gemini and returns the raw response text, with retry + backoff
 * for transient overload (503) and rate-limit (429) errors. A real
 * request/validation error (bad JSON, wrong schema) is NOT retried here.
 */
export async function generateJson(prompt: string, maxRetries = 2): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await genAI.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
      const text = response.text;
      if (!text) throw new Error("Gemini returned no text content");
      return text;
    } catch (err) {
      lastError = err;
      if (isRetryableError(err) && attempt < maxRetries) {
        const delay = extractRetryDelayMs(err) ?? 2000 * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}
