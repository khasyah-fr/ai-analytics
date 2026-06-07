type Props = {
  label: string;
  value: string;
  hint?: string;
};

export function AnalyticsCard({ label, value, hint}: Props) {

  return (
    <div className={`rounded-xl border p-5`}>
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-xs opacity-60 leading-snug">
          {hint}
        </div>
      )}
    </div>
  );
}