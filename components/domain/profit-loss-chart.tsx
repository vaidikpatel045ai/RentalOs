"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";

export function ProfitLossChart({
  daily,
  currency,
  monthLabel,
}: {
  daily: { day: number; income: number; costs: number }[];
  currency: string;
  monthLabel: string;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={1}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" interval="preserveStartEnd" />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            stroke="var(--muted-foreground)"
            tickFormatter={(v) => formatMoneyCompact(v, currency)}
            width={64}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
            }}
            labelFormatter={(day) => `${day} ${monthLabel}`}
            formatter={(value, name) => [formatMoney(Number(value), currency), name]}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="income" name="Income" fill="var(--risk-safe)" radius={[3, 3, 0, 0]} maxBarSize={14} />
          <Bar dataKey="costs" name="Expenses" fill="var(--risk-unsafe)" radius={[3, 3, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
