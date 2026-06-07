import { QueryPlan } from "@/lib/api";

export function PlanPanel({ plan, rowCount }: { plan: QueryPlan; rowCount: number }) {
  const ms = plan.execution_ms;
  const msLabel = ms < 1 ? "<1ms" : `${ms.toFixed(ms < 10 ? 1 : 0)}ms`;
  
  return (
    <div className="rounded-xl border-2 border-slate-200/80 bg-white p-5 text-xs font-mono shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
          Query Execution Plan
        </div>
        <div className="rounded-full border border-emerald-600/20 bg-emerald-50/50 px-2.5 py-1 font-mono text-[11px] tabular-nums font-semibold text-emerald-900">
          {rowCount} {rowCount === 1 ? "row" : "rows"} · {msLabel}
        </div>
      </div>
      
      <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        <Row label="Metric" value={<code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-900">{plan.metric}</code>} />
        <Row label="Time grain" value={<span className="font-semibold text-slate-800">{plan.time_grain}</span>} />
        <Row label="Field" value={plan.field ? <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-900">{plan.field}</code> : "—"} />
        <Row
          label="Date range"
          value={
            plan.date_from || plan.date_to
              ? <span className="font-semibold text-slate-800">{`${plan.date_from ?? "…"} → ${plan.date_to ?? "…"}`}</span>
              : "—"
          }
        />
        <Row
          label="Filters"
          full
          value={
            plan.filters.length === 0
              ? "—"
              : <span className="text-slate-700">
                  {plan.filters
                    .map(
                      (f) =>
                        `${f.field} ${f.op} ${
                          Array.isArray(f.value)
                            ? "[" + (f.value as unknown[]).join(", ") + "]"
                            : String(f.value)
                        }`,
                    )
                    .join("; ")}
                </span>
          }
        />
      </dl>
      
      <details className="group mt-5">
        <summary className="cursor-pointer select-none text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-emerald-800 transition-colors">
          <span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span>
          SQL Executed Console
        </summary>
        {/* Deep forest green terminal look for code output */}
        <pre className="mt-2.5 overflow-x-auto whitespace-pre-wrap rounded-md bg-[#022c22] p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90 border border-emerald-800/40">
          {plan.sql}
        </pre>
      </details>
    </div>
  );
}

function Row({
  label,
  value,
  full = false,
}: {
  label: string;
  value: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2 leading-relaxed" : "leading-relaxed"}>
      <dt className="inline text-slate-400 font-medium uppercase text-[10px] tracking-wide">{label} → </dt>
      <dd className="inline text-slate-800">{value}</dd>
    </div>
  );
}