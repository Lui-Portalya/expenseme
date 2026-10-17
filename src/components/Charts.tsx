"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCents } from "@/lib/money";

export function CategoryDonut({ data, currency }: {
  data: { name: string; color: string; cents: number }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="cents" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => formatCents(Number(v), currency)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TrendBars({ data, currency }: {
  data: { label: string; cents: number }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} interval="preserveStartEnd" />
        <YAxis hide />
        <Tooltip formatter={(v) => formatCents(Number(v), currency)} cursor={{ fill: "#f5f5f4" }} />
        <Bar dataKey="cents" fill="#047857" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
