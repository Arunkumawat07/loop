"use client";

import { useEffect, useState, useCallback } from "react";
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
};

export function InboxClient({ canEdit }: { canEdit: boolean }) {
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
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newChannel, setNewChannel] = useState<string>(CHANNELS[0]);
  const [submitting, setSubmitting] = useState(false);

  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (filters.search) params.set("search", filters.search);
    if (filters.channel) params.set("channel", filters.channel);
    if (filters.sentiment) params.set("sentiment", filters.sentiment);
    if (filters.status) params.set("status", filters.status);

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
          <h1 className="text-xl font-semibold text-slate-900">Inbox</h1>
          <p className="mt-1 text-sm text-slate-500">Search, filter, and triage feedback</p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Add feedback
            </button>
            <label className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {importing ? "Importing..." : "Import CSV"}
              <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} disabled={importing} />
            </label>
            <SimulateMenu onSimulate={handleSimulate} disabled={simulating} />
          </div>
        )}
      </div>

      {importSummary && (
        <div className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{importSummary}</div>
      )}

      {showAddForm && canEdit && (
        <form onSubmit={handleAddSubmit} className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <textarea
              required
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="What did the customer say?"
              rows={2}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <select
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            className="mt-3 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
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
          className="w-56 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <select
          value={filters.channel}
          onChange={(e) => updateFilter("channel", e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
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
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">All sentiment</option>
          <option value="POS">Positive</option>
          <option value="NEU">Neutral</option>
          <option value="NEG">Negative</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="NEW">New</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="ACTIONED">Actioned</option>
        </select>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {error && <div className="p-4 text-sm text-red-600">{error}</div>}

        {!error && loading && (
          <div className="p-8 text-center text-sm text-slate-400">Loading feedback...</div>
        )}

        {!error && !loading && items.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-400">
            No feedback matches these filters yet.
          </div>
        )}

        {!error && !loading && items.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Content</th>
                <th className="px-4 py-2 font-medium">Channel</th>
                <th className="px-4 py-2 font-medium">Sentiment</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="align-top hover:bg-slate-50">
                  <td className="max-w-md px-4 py-3 text-slate-800">{item.content}</td>
                  <td className="px-4 py-3 text-slate-600">{CHANNEL_LABELS[item.channel] ?? item.channel}</td>
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
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
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
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {disabled ? "Pulling..." : "Simulate channel ▾"}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-48 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {CHANNELS.map((c) => (
            <button
              key={c}
              onClick={() => {
                onSimulate(c);
                setOpen(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              Pull from {CHANNEL_LABELS[c]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
