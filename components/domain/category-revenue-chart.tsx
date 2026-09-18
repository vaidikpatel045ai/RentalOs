"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";
import type { CategoryRevenueRow } from "@/lib/queries/reports";

export function CategoryRevenueChart({ data, currency }: { data: CategoryRevenueRow[]; currency: string }) {
  const chartData = data.map((d) => ({ category: d.category.replaceAll("_", " "), revenue: d.revenue }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-heading text-base">Revenue by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="var(--muted-foreground)"
                tickFormatter={(v) => formatMoneyCompact(v, currency)}
              />
              <YAxis
                type="category"
                dataKey="category"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                stroke="var(--muted-foreground)"
                width={110}
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
              <Bar dataKey="revenue" fill="var(--gold)" radius={[0, 6, 6, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
