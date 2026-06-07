import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function DashboardCard({ title, subtitle, children }: Props) {
  return (
    <div className="rounded-xl border-2 border-slate-200/80 bg-white p-5 transition-all shadow-sm">
      <h3 className="text-sm font-bold tracking-tight text-emerald-950">
        {title}
      </h3>
      {subtitle && (
        <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-slate-400">
          {subtitle}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </div>
  );
}