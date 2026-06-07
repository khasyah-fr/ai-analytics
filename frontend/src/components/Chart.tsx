"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartRow, VizSpec } from "@/lib/api";
import { fmtAxisByUnit, fmtByUnit, fmtPeriod } from "@/lib/format";
import { useMobile } from "@/lib/useMobile";

type Props = {
  rows: ChartRow[];
  viz: VizSpec;
  height?: number;
};

const ACCENT = "#065f46";
const ACCENT_DARK = "#34d399";
const GRID = "#f1f5f9";

export function Chart({ rows, viz, height = 300 }: Props) {
  const isMobile = useMobile();

  if (!rows || rows.length === 0) {
    return <EmptyState />;
  }

  const xKey = viz.x ?? "x";
  const yKey = viz.y ?? "y";
  const yUnit = viz.y_unit ?? null;

  const isPeriod = xKey === "period";

  const needsAngle = isMobile || isPeriod;
  const xAxisProps = needsAngle
    ? {
        angle: isMobile ? -35 : -25,
        textAnchor: "end" as const,
        height: 50,
        fontSize: isMobile ? 10 : 11,
      }
    : { angle: 0, textAnchor: "middle" as const, height: 30, fontSize: 11 };

  const grain = viz.time_grain ?? "month";
  const data = rows.map((r) => {
    if (isPeriod && typeof r[xKey] === "string") {
      return { ...r, [xKey]: fmtPeriod(r[xKey] as string, grain) };
    }
    return r;
  });

  if (viz.type === "number") {
    const v = rows[0]?.[yKey] ?? null;
    return (
      <div className="flex h-32 items-center justify-center text-5xl font-bold tabular-nums tracking-tight text-emerald-950">
        {fmtByUnit(v, yUnit)}
      </div>
    );
  }

  if (viz.type === "table") {
    return <TableView rows={rows} />;
  }

  const tooltipFormatter = (value: unknown) => [fmtByUnit(value, yUnit), yKey];
  const yTickFormatter = (v: number) => fmtAxisByUnit(v, yUnit);

  if (viz.type === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            interval={isMobile ? "preserveStartEnd" : 0}
            {...xAxisProps}
          />
          <YAxis
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={yTickFormatter}
            width={60}
          />
          <Tooltip
            formatter={tooltipFormatter}
            contentStyle={tooltipStyle}
            labelStyle={{ fontWeight: 600, color: "#065f46" }}
          />
          <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500 }} />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={ACCENT}
            strokeWidth={2.5}
            dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: ACCENT }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // bar / stacked_bar
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          interval={0}
          {...xAxisProps}
        />
        <YAxis
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={yTickFormatter}
          width={60}
        />
        <Tooltip
          formatter={tooltipFormatter}
          contentStyle={tooltipStyle}
          labelStyle={{ fontWeight: 600, color: "#065f46" }}
          cursor={{ fill: "rgba(6, 95, 70, 0.04)" }}
        />
        <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500 }} />
        <Bar dataKey={yKey} fill={ACCENT} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: "2px solid #e2e8f0",
  boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
  backgroundColor: "#ffffff",
};

export const CHART_ACCENT = { light: ACCENT, dark: ACCENT_DARK };

function EmptyState() {
  return (
    <div className="flex h-32 items-center justify-center text-xs font-mono text-slate-400 uppercase tracking-wider">
      No operational records found.
    </div>
  );
}

function TableView({ rows }: { rows: ChartRow[] }) {
  const cols = Object.keys(rows[0] ?? {});
  return (
    <div className="overflow-x-auto rounded-lg border-2 border-slate-200/60">
      <table className="w-full border-collapse text-xs font-mono">
        <thead>
          <tr className="bg-slate-50 border-b-2 border-slate-200/80">
            {cols.map((c) => (
              <th
                key={c}
                className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-emerald-950"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-200/50 hover:bg-emerald-50/20 transition-colors">
              {cols.map((c) => (
                <td key={c} className="px-3 py-2.5 tabular-nums text-slate-700">
                  {r[c] === null ? "—" : String(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}