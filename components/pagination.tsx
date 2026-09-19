"use client";

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return <p className="text-xs text-ink-faint">{total} item{total === 1 ? "" : "s"}</p>;
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-xs text-ink-faint">
        {total} item{total === 1 ? "" : "s"} · page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-md border border-line px-3 py-1 text-ink-soft hover:bg-paper disabled:opacity-40"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-md border border-line px-3 py-1 text-ink-soft hover:bg-paper disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
