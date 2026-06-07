"use client";

import { useState } from "react";
import { AskPlaceholder } from "@/components/AskPlaceholder";
import { DashboardCard } from "@/components/DashboardCard";
import { Chart } from "@/components/Chart";
import { DataTable } from "@/components/DataTable";
import { AskChart } from "@/components/AskChart";
import { AskPlanCard } from "@/components/AskPlanCard";
import { PlanPanel } from "@/components/PlanPanel";
import { ResponsePlaceholder } from "@/components/ResponsePlaceholder";
import { apiPost, AskResponse, Unit } from "@/lib/api";
import { fmtNumber } from "@/lib/format";

const EXAMPLES = [
  "How many orders were delivered late last month",
  "Predict demand for PENCIL for the next 3 months",
];

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  async function submit(q: string) {
    if (!q.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const data = await apiPost<AskResponse>("/api/ask", { question: q });
      setResponse(data);
      setHistory((h) => [q, ...h.filter((x) => x !== q)].slice(0, 5));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Search Console & Viewport Area */}
      <header className="lg:col-span-4 space-y-12">
        <h1 className="text-3xl font-bold tracking-tight text-emerald-900"> Interact with data through questions </h1>
      </header>
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white border-2 border-slate-200/80 rounded-xl p-6 shadow-sm">
          <form onSubmit={(e) => { e.preventDefault(); submit(question); }} className="flex gap-2">
            <input
              className="w-full rounded-lg border-2 border-slate-200/70 bg-slate-50 px-4 py-3 text-sm transition-colors focus:border-emerald-800 focus:bg-white focus:outline-none font-mono text-xs"
              placeholder="Type your question here"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="rounded-lg bg-emerald-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 disabled:opacity-40"
              disabled={loading || !question.trim()}
            >
              {loading ? "Processing..." : "Enter"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-slate-400 font-medium uppercase text-[10px]">Examples:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => { setQuestion(ex); submit(ex); }}
                className="text-slate-600 hover:text-emerald-800 transition-colors text-[11px]"
              >
                {ex} ·
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 text-xs font-mono text-red-800 ">
            {error}
          </div>
        )}

        {loading && <ResponsePlaceholder />}
        {!response && !loading && !error && <AskPlaceholder />}
        {response && !loading && <ResponseView response={response} />}
      </div>

      {/* Navigation and Queries Sidebar */}
      <div className="lg:col-span-1 space-y-6">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 font-mono">Ask away!</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Your question will be answered with data fetched by sets of queries. It will show number or charts whenever necessary. Non-relevant questions are unsupported. 
          </p>
        </div>

        {history.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">Question History</h4>
            <div className="flex flex-col gap-1.5">
              {history.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setQuestion(q); submit(q); }}
                  className="w-full text-left truncate rounded-lg border-2 border-slate-200/80 bg-white px-3 py-2 text-xs text-slate-600 font-mono transition-all hover:border-emerald-800 hover:text-emerald-800"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResponseView({ response }: { response: AskResponse }) {
  if (response.kind === "unsupported") {
    return (
      <div className="space-y-3 rounded-xl border-2 border-amber-300/70 bg-amber-50/50 p-5">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-900 font-mono">
          Unsupported question
        </div>
        <p className="whitespace-pre-line text-sm text-amber-900/90 leading-relaxed">
          {response.message}
        </p>
        <div className="text-xs text-amber-900/80 font-mono space-y-1">
          <strong>Supported metrics:</strong> {response.supported_metrics.join(", ")}
          <br />
          <strong>Supported fields:</strong>{" "}
          {response.supported_fields.join(", ")}
        </div>
      </div>
    );
  }

  if (response.kind === "query") {
    const { answer, result } = response;
    const metricCol = result.viz_spec.y ?? null;
    const metricUnit: Unit | null = (result.viz_spec.y_unit as Unit | null) ?? null;
    return (
      <div className="space-y-5">
        <AnswerCard answer={answer} />
        <DashboardCard title="Visualization">
          <Chart rows={result.rows} viz={result.viz_spec} />
        </DashboardCard>
        <PlanPanel plan={result.plan} rowCount={result.rows.length} />
        <DashboardCard title="Underlying data" subtitle={`${result.rows.length} row(s)`}>
          <DataTable rows={result.rows} metricCol={metricCol} metricUnit={metricUnit} />
        </DashboardCard>
      </div>
    );
  }

  const { answer, result } = response;

  return (
    <div className="space-y-5">
      <AnswerCard answer={answer} />
      <DashboardCard
        title={`Forecast — ${result.plan.entity}`}
        subtitle={`Method: ${result.plan.method_used} · Horizon: ${result.plan.horizon_months} month(s)`}
      >
        <AskChart historical={result.historical} forecast={result.forecast} />
      </DashboardCard>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border-2 border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Inventory recommendation
          </div>
          <div className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-emerald-950">
            {fmtNumber(result.inventory_recommendation)} units
          </div>
          <p className="mt-2 text-xs font-mono text-slate-400">
            ⌈sum(forecast) × 1.20⌉ — 20% safety stock buffer.
          </p>
        </div>
        <div className="rounded-xl border-2 border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Methodology
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-700 font-mono">
            {result.methodology}
          </p>
        </div>
      </div>
      <AskPlanCard plan={result.plan} />
    </div>
  );
}

function AnswerCard({ answer }: { answer: string }) {
  return (
    <div className="rounded-xl border-2 border-slate-200/80 bg-white p-5 text-sm leading-relaxed text-slate-800 shadow-sm">
      {renderInlineMarkdown(answer)}
    </div>
  );
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0, m, idx = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={idx++} className="font-bold text-emerald-900">{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}