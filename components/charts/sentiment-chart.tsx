"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Slice = { name: string; value: number; color: string };

export function SentimentChart({ data }: { data: Slice[] }) {
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="rounded-lg border border-line bg-paper-raised p-4">
      <h3 className="text-sm font-medium text-ink-soft">Sentiment breakdown</h3>
      <div className="mt-2 h-56">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {data.map((slice) => (
                  <Cell key={slice.name} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  background: "var(--paper-raised)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--ink-soft)" }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-faint">
            No feedback in this period yet
          </div>
        )}
      </div>
    </div>
  );
}
