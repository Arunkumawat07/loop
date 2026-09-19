import Anthropic from "@anthropic-ai/sdk";

// Server-side only. Never import this into a "use client" component.
export const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Pinned model alias — change in this one place if it's ever deprecated.
export const MODEL = "claude-sonnet-4-5";

export function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}
