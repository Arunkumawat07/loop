"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function VolumeChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <div className="rounded-lg border border-line bg-paper-raised p-4">
      <h3 className="text-sm font-medium text-ink-soft">Feedback volume</h3>
      <div className="mt-2 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--ink-faint)" }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--ink-faint)" }} />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                background: "var(--paper-raised)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            />
            <Line type="monotone" dataKey="count" stroke="var(--signal)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
