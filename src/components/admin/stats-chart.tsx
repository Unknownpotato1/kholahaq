"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";

interface Series {
  date: string;
  revenue: number;
  sales: number;
}

interface TopAccount {
  username: string;
  count: number;
}

export function StatsChart({
  series,
  top,
}: {
  series: Series[];
  top: TopAccount[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 h-64">
        <div className="text-xs text-muted-foreground mb-2">Revenue (₹)</div>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="h-64">
        <div className="text-xs text-muted-foreground mb-2">Sales by day</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="lg:col-span-3 rounded-xl border border-border/40 bg-muted/30 p-4">
        <div className="text-xs text-muted-foreground mb-2">Top accounts by sales</div>
        {top.length === 0 ? (
          <div className="text-sm text-muted-foreground">No sales yet.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {top.map((t) => (
              <div
                key={t.username}
                className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-3 py-1.5 text-sm"
              >
                <span className="font-medium">{t.username}</span>
                <span className="text-xs text-muted-foreground">{t.count} sales</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
