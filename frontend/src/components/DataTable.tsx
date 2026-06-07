import { ChartRow, Unit } from "@/lib/api";
import { fmtByUnit, fmtMonthYear, fmtNumber } from "@/lib/format";

type Props = {
  rows: ChartRow[];
  metricCol?: string | null;
  metricUnit?: Unit | null;
};

export function DataTable({ rows, metricCol, metricUnit }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-xs font-mono text-slate-400 uppercase tracking-wider p-2">
        No rows found.
      </p>
    );
  }
  
  const cols = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto rounded-lg border-2 border-slate-200/60">
      <table className="w-full border-collapse text-xs font-mono">
        <thead className="bg-slate-50 border-b-2 border-slate-200/80">
          <tr>
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
            <tr
              key={i}
              className="border-b border-slate-200/50 last:border-0 hover:bg-emerald-50/20 transition-colors"
            >
              {cols.map((c) => (
                <td key={c} className="px-3 py-2.5 tabular-nums text-slate-700">
                  {formatCell(r[c], c, metricCol, metricUnit)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(
  v: unknown,
  col: string,
  metricCol?: string | null,
  metricUnit?: Unit | null,
): string {
  if (v === null || v === undefined) return "—";

  if (metricCol && col === metricCol && typeof v === "number") {
    return fmtByUnit(v, metricUnit);
  }

  if (col === "period" && typeof v === "string") {
    return fmtMonthYear(v);
  }

  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    return v.slice(0, 10);
  }

  if (typeof v === "number") {
    if (Number.isInteger(v)) return fmtNumber(v);
    // Heuristic for unhinted floats: 2 decimals reads better than 4.
    return v.toFixed(2);
  }

  return String(v);
}