"use client";

// AI4, criterion 3: "exportable (PDF or shareable page)". This report
// page IS the shareable page (it has its own URL), and this button
// gives a one-click path to a PDF via the browser's native print-to-PDF
// — no extra PDF-generation library needed. print:hidden classes on
// this page hide the app chrome (nav, buttons) so the printed output is
// clean.
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft hover:bg-paper"
    >
      Export as PDF
    </button>
  );
}
