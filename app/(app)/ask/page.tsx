"use client";

import { useState } from "react";

type CitedItem = {
  id: string;
  content: string;
  channel: string;
  sentiment: "POS" | "NEU" | "NEG" | null;
  createdAt: string;
};

type Exchange = {
  question: string;
  answer: string;
  citedItems: CitedItem[];
};

const SUGGESTED_QUESTIONS = [
  "What are people saying about onboarding?",
  "Are customers asking for SSO?",
  "What's the biggest complaint about billing?",
  "What do people like about the dashboard?",
];

const SENTIMENT_LABEL: Record<string, string> = { POS: "Positive", NEU: "Neutral", NEG: "Negative" };

// AI3 — Ask LOOP. Plain-English questions, answered strictly from
// retrieved feedback (see lib/search.ts + lib/ai.ts), with citations the
// person can click to verify. This is intentionally simple — a running
// list of exchanges, not a persisted chat thread — since the brief asks
// for grounded Q&A, not chat history.
export default function AskLoopPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);

  async function handleAsk(q?: string) {
    const finalQuestion = (q ?? question).trim();
    if (!finalQuestion) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/insights/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: finalQuestion }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to get an answer");
      }
      const data = await res.json();
      setExchanges((prev) => [
        { question: finalQuestion, answer: data.answer, citedItems: data.citedItems },
        ...prev,
      ]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-xl font-semibold text-slate-900">Ask LOOP</h1>
      <p className="mt-1 text-sm text-slate-500">
        Ask a plain-English question. Answers are grounded in your workspace's
        actual feedback and cite the specific items they're based on.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What are users saying about onboarding?"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>

      {exchanges.length === 0 && !loading && (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleAsk(q)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mt-6 space-y-6">
        {exchanges.map((ex, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-900">{ex.question}</p>
            <p className="mt-2 text-sm text-slate-700">{ex.answer}</p>

            {ex.citedItems.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Based on {ex.citedItems.length} feedback item{ex.citedItems.length > 1 ? "s" : ""}
                </p>
                {ex.citedItems.map((item) => (
                  <div key={item.id} className="rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                    <span className="font-medium text-slate-500">
                      {item.channel} · {item.sentiment ? SENTIMENT_LABEL[item.sentiment] : "unclassified"}
                    </span>
                    <p className="mt-0.5">{item.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
