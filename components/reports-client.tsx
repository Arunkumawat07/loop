"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { subDays } from "date-fns";

type ReportListItem = {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  generatedBy: { name: string; email: string };
};

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export function ReportsClient({ canGenerate }: { canGenerate: boolean }) {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadReports() {
    setLoading(true);
    const res = await fetch("/api/reports");
    if (res.ok) setReports(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function handleGenerate(days: number) {
    setGenerating(true);
    setError(null);
    try {
      const periodEnd = new Date();
      const periodStart = subDays(periodEnd, days);
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to generate report");
      }
      const report = await res.json();
      // Jump straight to the new report rather than making the user find
      // it in the list.
      window.location.href = `/reports/${report.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setGenerating(false);
    }
  }

  return (
    <div>
      {canGenerate && (
        <div className="rounded-lg border border-line bg-paper-raised p-4">
          <p className="text-sm font-medium text-ink">Generate a new report</p>
          <p className="mt-1 text-xs text-ink-soft">
            Claude will summarize themes, sentiment shifts, and recommended actions
            for the period you choose — grounded in your workspace's real data.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.days}
                onClick={() => handleGenerate(preset.days)}
                disabled={generating}
                className="rounded-md bg-signal px-3 py-1.5 text-sm font-medium text-signal-ink transition hover:opacity-90 disabled:opacity-60"
              >
                {generating ? "Generating..." : preset.label}
              </button>
            ))}
          </div>
          {generating && (
            <p className="mt-2 text-xs text-ink-faint">
              This can take 10-20 seconds — Claude is reading through the period's feedback.
            </p>
          )}
          {error && <p className="mt-2 text-xs text-negative">{error}</p>}
        </div>
      )}

      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          Past reports
        </p>
        {loading ? (
          <p className="mt-2 text-sm text-ink-faint">Loading...</p>
        ) : reports.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">
            No reports generated yet.{canGenerate ? " Use the buttons above to create one." : ""}
          </p>
        ) : (
          <div className="mt-2 divide-y divide-line rounded-lg border border-line bg-paper-raised">
            {reports.map((r) => (
              <Link
                key={r.id}
                href={`/reports/${r.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-paper"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{r.title}</p>
                  <p className="text-xs text-ink-faint">
                    Generated {new Date(r.createdAt).toLocaleDateString()} by {r.generatedBy.name}
                  </p>
                </div>
                <span className="text-sm text-signal">View →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
