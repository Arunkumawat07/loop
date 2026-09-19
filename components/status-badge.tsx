"use client";

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-signal-soft text-signal border-signal/30",
  REVIEWED: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  ACTIONED: "bg-positive-soft text-positive border-positive/30",
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
    return <span className="text-xs text-ink-faint">unclassified</span>;
  }
  const styles = {
    POS: "bg-positive-soft text-positive",
    NEU: "bg-neutral-soft text-ink-soft",
    NEG: "bg-negative-soft text-negative",
  };
  const labels = { POS: "Positive", NEU: "Neutral", NEG: "Negative" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[sentiment]}`}>
      {labels[sentiment]}
    </span>
  );
}
