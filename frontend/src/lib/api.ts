const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const AUTH_TOKEN = process.env.API_AUTH_TOKEN || "example-auth-token-2026";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Authorization": `Bearer ${AUTH_TOKEN}`,
    },
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${AUTH_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

// ---- Response types ----

export type AnalyticsData = {
  total_orders: number;
  delivered_orders: number;
  delayed_orders: number;
  in_transit_orders: number;
  exception_orders: number;
  canceled_orders: number;
  on_time_rate: number;
  avg_delivery_days: number;
};

export type ChartRow = Record<string, string | number | null>;
export type Unit = "count" | "percent" | "days" | "usd";
export type TimeGrain = "day" | "week" | "month" | "year" | "none";
export type VizSpec = {
  type: "line" | "bar" | "stacked_bar" | "number" | "table";
  x?: string | null;
  y?: string | null;
  series?: string | null;
  y_unit?: Unit | null;
  time_grain?: TimeGrain | null;
};

export type ChartResponse = {
  rows: ChartRow[];
  viz_spec: VizSpec;
  plan?: QueryPlan;
};

export type Filter = { field: string; op: "eq" | "in"; value: unknown };
export type QueryPlan = {
  metric: string;
  field: string | null;
  time_grain: string;
  filters: Filter[];
  date_from: string | null;
  date_to: string | null;
  sql: string;
  execution_ms: number;
};

export type QueryResult = {
  rows: ChartRow[];
  plan: QueryPlan;
  viz_spec: VizSpec;
};

export type ForecastPoint = { period: string; value: number };
export type ForecastResult = {
  historical: ForecastPoint[];
  forecast: ForecastPoint[];
  inventory_recommendation: number;
  methodology: string;
  plan: {
    grain: string;
    entity: string;
    horizon_months: number;
    method_used: string;
    params: Record<string, number | string>;
  };
};

export type AskResponse =
  | { kind: "query"; answer: string; result: QueryResult }
  | { kind: "forecast"; answer: string; result: ForecastResult }
  | {
      kind: "unsupported";
      message: string;
      supported_metrics: string[];
      supported_fields: string[];
    };
