"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type ThemeRow = { themeId: string; name: string; color: string; count: number };

export function TopThemesChart({ data }: { data: ThemeRow[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 sm:col-span-2">
      <h3 className="text-sm font-medium text-slate-700">Top themes</h3>
      <div className="mt-2 h-56">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 11, fill: "#334155" }}
              />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((row) => (
                  <Cell key={row.themeId} fill={row.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No themes yet — themes appear once feedback is classified (Week 3)
          </div>
        )}
      </div>
    </div>
  );
}
