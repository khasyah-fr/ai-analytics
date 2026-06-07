import type { TimeGrain, Unit } from "@/lib/api";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function fmtPercent(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

export function fmtNumber(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return v.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtDays(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${v.toFixed(2)} days`;
}

export function fmtCurrencyUSD(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);
}

export function fmtDateISO(v: string | null | undefined): string {
  if (!v) return "—";
  return v.length > 10 ? v.slice(0, 10) : v;
}

export function fmtMonthYear(v: string | null | undefined): string {
  if (!v) return "—";
  const iso = v.length > 10 ? v.slice(0, 10) : v;
  const m = iso.match(/^(\d{4})-(\d{2})/);
  if (!m) return iso;
  return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

export function fmtPeriod(
  v: string | null | undefined,
  grain: TimeGrain | null | undefined,
): string {
  if (!v) return "—";
  const iso = v.length > 10 ? v.slice(0, 10) : v;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const [, year, mm, dd] = m;
  const month = MONTHS[Number(mm) - 1];
  switch (grain) {
    case "year":
      return year;
    case "week":
    case "day":
      return `${month} ${Number(dd)}`;
    case "month":
    default:
      return `${month} ${year}`;
  }
}

export function fmtByUnit(v: unknown, unit: Unit | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (typeof v !== "number" || Number.isNaN(v)) return String(v);
  switch (unit) {
    case "percent":
      return fmtPercent(v);
    case "usd":
      return fmtCurrencyUSD(v);
    case "days":
      return fmtDays(v);
    case "count":
      return fmtNumber(v);
    default:
      return Number.isInteger(v) ? fmtNumber(v) : v.toFixed(2);
  }
}

// For axis ticks we want a more compact form (no decimals on big counts/$).
export function fmtAxisByUnit(v: unknown, unit: Unit | null | undefined): string {
  if (typeof v !== "number" || Number.isNaN(v)) return String(v ?? "");
  switch (unit) {
    case "percent":
      return `${(v * 100).toFixed(0)}%`;
    case "usd":
      return v >= 1000
        ? `$${(v / 1000).toFixed(1)}k`
        : `$${v.toFixed(0)}`;
    case "days":
      return `${v.toFixed(1)}d`;
    default:
      return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : fmtNumber(v);
  }
}
