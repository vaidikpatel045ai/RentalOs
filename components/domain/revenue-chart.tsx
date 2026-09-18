"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";

export function RevenueChart({
  revenue,
  currency,
}: {
  revenue: { today: number; week: number; month: number; year: number };
  currency: string;
}) {
  // Short labels — "This Month"/"This Year" wrap or collide with four
  // categories squeezed into a phone-width chart.
  const data = [
    { period: "Today", amount: revenue.today },
    { period: "Week", amount: revenue.week },
    { period: "Month", amount: revenue.month },
    { period: "Year", amount: revenue.year },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-heading text-base">Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="var(--muted-foreground)"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="var(--muted-foreground)"
                tickFormatter={(v) => formatMoneyCompact(v, currency)}
                width={56}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 12,
                }}
                formatter={(value) => formatMoney(Number(value), currency)}
              />
              <Bar dataKey="amount" fill="var(--gold)" radius={[6, 6, 0, 0]} maxBarSize={64} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
