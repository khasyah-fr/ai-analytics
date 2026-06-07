"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ForecastPoint } from "@/lib/api";
import { fmtMonthYear, fmtNumber } from "@/lib/format";

type Props = {
  historical: ForecastPoint[];
  forecast: ForecastPoint[];
  height?: number;
};

const HIST = "#065f46";
const FCST = "#059669";
const GRID = "#f1f5f9";

export function AskChart({ historical, forecast, height = 320 }: Props) {
  const periods = new Map<string, { period: string; historical?: number; forecast?: number }>();
  for (const p of historical) {
    const key = fmtMonthYear(p.period);
    periods.set(key, { period: key, historical: p.value });
  }
  for (const p of forecast) {
    const key = fmtMonthYear(p.period);
    const existing = periods.get(key) ?? { period: key };
    existing.forecast = p.value;
    periods.set(key, existing);
  }

  const lastHist = historical.at(-1);
  if (lastHist) {
    const key = fmtMonthYear(lastHist.period);
    const existing = periods.get(key);
    if (existing && existing.forecast === undefined) {
      existing.forecast = lastHist.value;
    }
  }

  const data = Array.from(periods.values());

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis 
          dataKey="period" 
          fontSize={11} 
          tickLine={false} 
          axisLine={{ stroke: GRID }} 
        />
        <YAxis
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={50}
          tickFormatter={(v: number) => fmtNumber(v)}
        />
        <Tooltip
          formatter={(v: unknown) => fmtNumber(typeof v === "number" ? v : Number(v))}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "2px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
            backgroundColor: "#ffffff",
          }}
          labelStyle={{ fontWeight: 600, color: "#065f46" }}
        />
        <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500 }} />
        <Line
          type="monotone"
          dataKey="historical"
          name="Historical"
          stroke={HIST}
          strokeWidth={2.5}
          dot={{ r: 3, fill: HIST, strokeWidth: 0 }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="forecast"
          name="Forecast Projection"
          stroke={FCST}
          strokeDasharray="6 4"
          strokeWidth={2}
          dot={{ r: 3, fill: "transparent", stroke: FCST, strokeWidth: 2 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}