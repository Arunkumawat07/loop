"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Papa from "papaparse";
import { StatusBadge, SentimentBadge } from "@/components/status-badge";
import { Pagination } from "@/components/pagination";

const CHANNELS = ["support_ticket", "app_store", "nps", "sales_call", "community"] as const;
const CHANNEL_LABELS: Record<string, string> = {
  support_ticket: "Support ticket",
  app_store: "App store",
  nps: "NPS survey",
  sales_call: "Sales call",
  community: "Community",
};

type FeedbackItem = {
  id: string;
  content: string;
  channel: string;
  sentiment: "POS" | "NEU" | "NEG" | null;
  status: "NEW" | "REVIEWED" | "ACTIONED";
  createdAt: string;
  themes: { theme: { id: string; name: string; color: string } }[];
};

type Filters = {
  search: string;
  channel: string;
  sentiment: string;
  status: string;
  themeId: string;
};

export function InboxClient({ canEdit }: { canEdit: boolean }) {
  const searchParams = useSearchParams();
  const initialThemeId = searchParams.get("themeId") ?? "";

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    channel: "",
    sentiment: "",
    status: "",
    themeId: initialThemeId,
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newChannel, setNewChannel] = useState<string>(CHANNELS[0]);
  const [submitting, setSubmitting] = useState(false);

  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [reclassifyingId, setReclassifyingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (filters.search) params.set("search", filters.search);
    if (filters.channel) params.set("channel", filters.channel);
    if (filters.sentiment) params.set("sentiment", filters.sentiment);
    if (filters.status) params.set("status", filters.status);
    if (filters.themeId) params.set("themeId", filters.themeId);

    try {
      const res = await fetch(`/api/feedback?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load feedback");
      const data = await res.json();
      setItems(data.items);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  }

  async function handleStatusChange(id: string, status: "NEW" | "REVIEWED" | "ACTIONED") {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    await fetch(`/api/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  // AI1, criterion 4 — manual re-classify action.
  async function handleReclassify(id: string) {
    setReclassifyingId(id);
    try {
      const res = await fetch(`/api/feedback/${id}/classify`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      }
    } finally {
      setReclassifyingId(null);
    }
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent, channel: newChannel }),
    });
    setSubmitting(false);
    if (res.ok) {
      setNewContent("");
      setShowAddForm(false);
      setPage(1);
      fetchItems();
    }
  }

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportSummary(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        const res = await fetch("/api/feedback/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        });
        const data = await res.json();
        setImporting(false);
        if (res.ok) {
          setImportSummary(
            `Imported ${data.importedCount}, failed ${data.failedCount}` +
              (data.failedCount > 0 ? ` (see console for reasons)` : "")
          );
          if (data.failedCount > 0) console.warn("Import failures:", data.failures);
          setPage(1);
          fetchItems();
        } else {
          setImportSummary(data.error ?? "Import failed");
        }
      },
      error: () => {
        setImporting(false);
        setImportSummary("Could not parse that CSV file");
      },
    });
    e.target.value = "";
  }

  async function handleSimulate(channel: string) {
    setSimulating(true);
    const res = await fetch("/api/feedback/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, count: 10 }),
    });
    setSimulating(false);
    if (res.ok) {
      setPage(1);
      fetchItems();
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Inbox</h1>
          <p className="mt-1 text-sm text-ink-soft">Search, filter, and triage feedback</p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="rounded-md bg-signal px-3 py-1.5 text-sm font-medium text-signal-ink hover:opacity-90"
            >
              + Add feedback
            </button>
            <label className="cursor-pointer rounded-md border border-line bg-paper-raised px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-paper">
              {importing ? "Importing..." : "Import CSV"}
              <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} disabled={importing} />
            </label>
            <SimulateMenu onSimulate={handleSimulate} disabled={simulating} />
          </div>
        )}
      </div>

      {importSummary && (
        <div className="mt-3 rounded-md bg-paper px-3 py-2 text-sm text-ink-soft">{importSummary}</div>
      )}

      {showAddForm && canEdit && (
        <form onSubmit={handleAddSubmit} className="mt-4 rounded-lg border border-line bg-paper-raised p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <textarea
              required
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="What did the customer say?"
              rows={2}
              className="rounded-md border border-line px-3 py-2 text-sm focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
            />
            <select
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
              className="rounded-md border border-line px-3 py-2 text-sm"
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 rounded-md bg-signal px-3 py-1.5 text-sm font-medium text-signal-ink hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Adding..." : "Add"}
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          placeholder="Search feedback..."
          className="w-56 rounded-md border border-line px-3 py-1.5 text-sm focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
        />
        <select
          value={filters.channel}
          onChange={(e) => updateFilter("channel", e.target.value)}
          className="rounded-md border border-line px-3 py-1.5 text-sm"
        >
          <option value="">All channels</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {CHANNEL_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          value={filters.sentiment}
          onChange={(e) => updateFilter("sentiment", e.target.value)}
          className="rounded-md border border-line px-3 py-1.5 text-sm"
        >
          <option value="">All sentiment</option>
          <option value="POS">Positive</option>
          <option value="NEU">Neutral</option>
          <option value="NEG">Negative</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="rounded-md border border-line px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="NEW">New</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="ACTIONED">Actioned</option>
        </select>
        {filters.themeId && (
          <button
            onClick={() => updateFilter("themeId", "")}
            className="flex items-center gap-1 rounded-md border border-signal/30 bg-signal-soft px-3 py-1.5 text-sm text-signal hover:opacity-80"
          >
            Theme filter active
            <span aria-hidden>×</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-line bg-paper-raised">
        {error && <div className="p-4 text-sm text-negative">{error}</div>}

        {!error && loading && (
          <div className="p-8 text-center text-sm text-ink-faint">Loading feedback...</div>
        )}

        {!error && !loading && items.length === 0 && (
          <div className="p-8 text-center text-sm text-ink-faint">
            No feedback matches these filters yet.
          </div>
        )}

        {!error && !loading && items.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-2 font-medium">Content</th>
                <th className="px-4 py-2 font-medium">Channel</th>
                <th className="px-4 py-2 font-medium">Themes</th>
                <th className="px-4 py-2 font-medium">Sentiment</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Date</th>
                {canEdit && <th className="px-4 py-2 font-medium">AI</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => (
                <tr key={item.id} className="align-top hover:bg-paper">
                  <td className="max-w-md px-4 py-3 text-ink">{item.content}</td>
                  <td className="px-4 py-3 text-ink-soft">{CHANNEL_LABELS[item.channel] ?? item.channel}</td>
                  <td className="max-w-[160px] px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.themes.length === 0 && (
                        <span className="text-xs text-ink-faint">—</span>
                      )}
                      {item.themes.map(({ theme }) => (
                        <span
                          key={theme.id}
                          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{ backgroundColor: `${theme.color}20`, color: theme.color }}
                        >
                          {theme.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <SentimentBadge sentiment={item.sentiment} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={item.status}
                      disabled={!canEdit}
                      onChange={canEdit ? (s) => handleStatusChange(item.id, s) : undefined}
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-faint">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleReclassify(item.id)}
                        disabled={reclassifyingId === item.id}
                        className="text-xs font-medium text-signal hover:opacity-80 disabled:opacity-50"
                      >
                        {reclassifyingId === item.id ? "..." : "Re-classify"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-3">
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>
    </main>
  );
}

function SimulateMenu({
  onSimulate,
  disabled,
}: {
  onSimulate: (channel: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="rounded-md border border-line bg-paper-raised px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-paper disabled:opacity-60"
      >
        {disabled ? "Pulling..." : "Simulate channel ▾"}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-48 rounded-md border border-line bg-paper-raised py-1 shadow-lg">
          {CHANNELS.map((c) => (
            <button
              key={c}
              onClick={() => {
                onSimulate(c);
                setOpen(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-ink-soft hover:bg-paper"
            >
              Pull from {CHANNEL_LABELS[c]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
