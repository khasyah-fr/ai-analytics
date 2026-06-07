import type { ForecastResult } from "@/lib/api";

export function AskPlanCard({ plan }: { plan: ForecastResult["plan"] }) {
  const params = plan.params ?? {};
  const paramEntries = Object.entries(params);
  return (
    <div className="rounded-xl border-2 border-slate-200/80 bg-white p-5 text-xs font-mono shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
        Forecast Plan Metadata
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        <Row label="Grain" value={<code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-900">{plan.grain}</code>} />
        <Row label="Entity" value={<code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-900">{plan.entity}</code>} />
        <Row label="Method used" value={<code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-900">{plan.method_used}</code>} />
        <Row label="Horizon" value={`${plan.horizon_months} month(s)`} />
        {paramEntries.length > 0 && (
          <Row
            label="Parameters"
            full
            value={
              <span className="text-slate-700">
                {paramEntries
                  .map(([k, v]) => `${k}=${formatParam(v)}`)
                  .join(", ")}
              </span>
            }
          />
        )}
      </dl>
    </div>
  );
}

function formatParam(v: unknown): string {
  if (typeof v === "number") {
    return Number.isInteger(v) ? String(v) : v.toFixed(3);
  }
  return String(v);
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
      <dd className="inline font-semibold text-slate-800">{value}</dd>
    </div>
  );
}