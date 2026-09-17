import { db } from "@/lib/db";

// AI3 retrieval step: "find the most relevant feedback before answering."
// This uses lexical (keyword-overlap) scoring rather than true vector
// embeddings — it's a deliberate simplification that keeps the project
// dependency-free (no separate embeddings provider / API key) while
// still satisfying the retrieve-then-answer + grounding requirement.
// To upgrade to real semantic search: populate the Embedding model on
// ingest via a hosted embeddings provider (e.g. Voyage AI, which
// Anthropic recommends), then swap this function's body for a pgvector
// cosine-similarity query. The rest of the Ask LOOP pipeline (grounded
// answer + citations) doesn't need to change.

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "what", "which", "who",
  "how", "why", "do", "does", "did", "about", "our", "their", "we", "they",
  "in", "on", "at", "to", "for", "of", "and", "or", "with", "saying",
  "users", "customers", "people", "feedback", "it", "this", "that",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export async function retrieveRelevantFeedback(
  workspaceId: string,
  question: string,
  topK = 8
) {
  const queryTerms = tokenize(question);

  if (queryTerms.length === 0) {
    // Question was all stopwords / too short — fall back to most recent
    // items rather than returning nothing.
    return db.feedback.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: topK,
      select: { id: true, content: true, channel: true, sentiment: true },
    });
  }

  // Pull a reasonably large candidate pool, score in-process. Fine at
  // this project's scale (hundreds to low thousands of rows); a real
  // production system would do this scoring in the database or via a
  // vector index instead.
  const candidates = await db.feedback.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, content: true, channel: true, sentiment: true },
  });

  const scored = candidates
    .map((item) => {
      const itemTerms = new Set(tokenize(item.content));
      const overlap = queryTerms.filter((t) => itemTerms.has(t)).length;
      return { item, score: overlap };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map((s) => s.item);
}
