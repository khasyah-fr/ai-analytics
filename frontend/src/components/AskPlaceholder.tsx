const METRICS = [
  { name: "total_orders", unit: "count" },
  { name: "delivered_orders", unit: "count" },
  { name: "delayed_orders", unit: "count" },
  { name: "in_transit_orders", unit: "count" },
  { name: "exception_orders", unit: "count" },
  { name: "canceled_orders", unit: "count" },
  { name: "on_time_rate", unit: "%" },
  { name: "delay_rate", unit: "%" },
  { name: "avg_delivery_days", unit: "days" },
];

const FIELDS = [
  "carrier",
  "region",
  "product_category",
  "warehouse",
  "client_id",
  "destination_city",
];

const TIME_GRAINS = ["day", "week", "month", "year", "none"];

export function AskPlaceholder() {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-6">
      <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
        Notes
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">
        2 tools available:
        <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-xs">
          query
        </code>
        for descriptive analytics and
        <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-xs">
          forecast
        </code>
        for prediction.
      </p>

    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
        {title}
      </div>
      {children}
    </div>
  );
}
