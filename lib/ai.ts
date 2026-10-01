import { classificationResultSchema } from "@/lib/validation/schemas";
import { generateJson, stripCodeFences } from "@/lib/ai-client";
import type { z } from "zod";

export type ClassificationResult = z.infer<typeof classificationResultSchema>;

/**
 * AI1 — Auto-classification (Section 09.1).
 * Sends one feedback item to Gemini and asks for strictly structured
 * JSON: sentiment, sentimentScore, themes, featureArea, rationale.
 * generateJson() (lib/ai-client.ts) already retries on transient 503
 * overload errors with backoff; here we additionally retry once on a
 * parse/validation failure specifically (malformed JSON, wrong shape),
 * which is a different failure mode than server overload.
 */
export async function classifyFeedback(
  content: string,
  existingThemeNames: string[]
): Promise<ClassificationResult> {
  const themeList =
    existingThemeNames.length > 0
      ? existingThemeNames.map((t) => `- ${t}`).join("\n")
      : "(no existing themes yet — you may propose new ones)";

  const prompt = `You are classifying a single piece of customer feedback for a product analytics tool.

Existing themes in this workspace (reuse one of these by exact name whenever the feedback fits; only propose a new theme name if none fit):
${themeList}

Feedback:
"""
${content}
"""

Return a JSON object matching exactly this shape:
{
  "sentiment": "POS" | "NEU" | "NEG",
  "sentimentScore": number between -1 and 1,
  "themes": [string, ...] (1 to 3 theme names, reusing existing ones where they fit),
  "featureArea": string (a short 2-4 word label, e.g. "Onboarding", "Billing", "Mobile app"),
  "rationale": string (one short sentence explaining the classification)
}`;

  async function attempt(): Promise<ClassificationResult> {
    const text = await generateJson(prompt);
    const cleaned = stripCodeFences(text);
    const json = JSON.parse(cleaned);
    return classificationResultSchema.parse(json);
  }

  try {
    return await attempt();
  } catch (firstError) {
    try {
      return await attempt();
    } catch (secondError) {
      throw new Error(
        `Classification failed after retry: ${
          secondError instanceof Error ? secondError.message : String(secondError)
        }`
      );
    }
  }
}

export type GroundedAnswer = {
  answer: string;
  usedItemIds: string[];
};

/**
 * AI3 — Ask LOOP (Section 09.2). Retrieve-then-answer.
 * The caller (see lib/search.ts) handles retrieval; this only handles
 * "answer strictly from what you were given." Grounding is mandatory —
 * the prompt forbids using anything outside the provided items.
 */
export async function answerFromFeedback(
  question: string,
  items: { id: string; content: string; channel: string; sentiment: string | null }[]
): Promise<GroundedAnswer> {
  if (items.length === 0) {
    return {
      answer:
        "I couldn't find any feedback in this workspace related to that question. Try rephrasing, or check back once more feedback has come in.",
      usedItemIds: [],
    };
  }

  const context = items
    .map((item, i) => `[${i + 1}] (id: ${item.id}, channel: ${item.channel}, sentiment: ${item.sentiment ?? "unclassified"}) ${item.content}`)
    .join("\n");

  const prompt = `You are answering a question about customer feedback using ONLY the feedback items listed below. Do not use any knowledge or feedback from outside this list — if the provided items don't contain enough information to answer, say so plainly instead of guessing or inventing feedback.

Feedback items:
${context}

Question: ${question}

Instructions:
- Answer in 2-4 sentences, grounded strictly in the items above.
- Refer to items by their bracket number, e.g. "[1]" or "[2][4]", so the reader can trace your answer back to specific feedback.
- If the items don't really address the question, say that directly.

Return a JSON object:
{
  "answer": string,
  "usedIndices": [number, ...] (the bracket numbers you actually cited, e.g. [1, 3])
}`;

  const text = await generateJson(prompt);
  const cleaned = stripCodeFences(text);
  const parsed = JSON.parse(cleaned) as { answer: string; usedIndices: number[] };

  const usedItemIds = parsed.usedIndices
    .map((i) => items[i - 1]?.id)
    .filter((id): id is string => Boolean(id));

  return { answer: parsed.answer, usedItemIds };
}
