export function ResponsePlaceholder() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div className="rounded-xl border-2 border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-800 font-mono">
          <Spinner /> Loading...
        </div>
        <div className="mt-4 space-y-2.5">
          <Bar w="w-2/3" />
          <Bar w="w-5/6" />
          <Bar w="w-1/2" />
        </div>
      </div>
      
      {/* Bottom Visualization Mock Box */}
      <div className="rounded-xl border-2 border-slate-200/80 bg-white p-5 shadow-sm">
        <Bar w="w-1/4" />
        <div className="mt-6 h-48 animate-pulse rounded-lg bg-slate-100 border border-slate-200/40" />
      </div>
    </div>
  );
}

function Bar({ w }: { w: string }) {
  return <div className={`h-2.5 animate-pulse rounded-full bg-slate-200/60 ${w}`} />;
}

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin text-emerald-800"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3.5" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}