"use client";

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700 border-blue-200",
  REVIEWED: "bg-amber-50 text-amber-700 border-amber-200",
  ACTIONED: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function StatusBadge({
  status,
  onChange,
  disabled,
}: {
  status: "NEW" | "REVIEWED" | "ACTIONED";
  onChange?: (next: "NEW" | "REVIEWED" | "ACTIONED") => void;
  disabled?: boolean;
}) {
  if (!onChange) {
    return (
      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
        {status}
      </span>
    );
  }

  return (
    <select
      value={status}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as "NEW" | "REVIEWED" | "ACTIONED")}
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]} disabled:opacity-50`}
    >
      <option value="NEW">NEW</option>
      <option value="REVIEWED">REVIEWED</option>
      <option value="ACTIONED">ACTIONED</option>
    </select>
  );
}

export function SentimentBadge({ sentiment }: { sentiment: "POS" | "NEU" | "NEG" | null }) {
  if (!sentiment) {
    return <span className="text-xs text-slate-400">unclassified</span>;
  }
  const styles = {
    POS: "bg-emerald-50 text-emerald-700",
    NEU: "bg-slate-100 text-slate-600",
    NEG: "bg-red-50 text-red-700",
  };
  const labels = { POS: "Positive", NEU: "Neutral", NEG: "Negative" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[sentiment]}`}>
      {labels[sentiment]}
    </span>
  );
}
