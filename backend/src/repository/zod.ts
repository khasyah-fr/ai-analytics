import { z } from 'zod';

export interface Metric {
  name: string;
  description: string;
  sqlAggregate: string;
  outputLabel: string;
  unit: 'count' | 'percent' | 'days' | 'usd';
}

export const METRICS: Record<string, Metric> = {
  total_orders: { name: 'total_orders', description: 'Total orders.', sqlAggregate: 'COUNT(*)', outputLabel: 'total_orders', unit: 'count' },
  delivered_orders: { name: 'delivered_orders', description: "Delivered orders.", sqlAggregate: "SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)", outputLabel: 'delivered_orders', unit: 'count' },
  delayed_orders: { name: 'delayed_orders', description: "Delayed orders.", sqlAggregate: "SUM(CASE WHEN status = 'delayed' THEN 1 ELSE 0 END)", outputLabel: 'delayed_orders', unit: 'count' },
  in_transit_orders: { name: 'in_transit_orders', description: "Orders in transit.", sqlAggregate: "SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END)", outputLabel: 'in_transit_orders', unit: 'count' },
  exception_orders: { name: 'exception_orders', description: "Orders exception.", sqlAggregate: "SUM(CASE WHEN status = 'exception' THEN 1 ELSE 0 END)", outputLabel: 'exception_orders', unit: 'count' },
  canceled_orders: { name: 'canceled_orders', description: "Orders canceled.", sqlAggregate: "SUM(CASE WHEN status = 'canceled' THEN 1 ELSE 0 END)", outputLabel: 'canceled_orders', unit: 'count' },
  on_time_rate: { name: 'on_time_rate', description: 'On-time delivery rate.', sqlAggregate: "SUM(CASE WHEN status = 'delivered' THEN 1.0 ELSE 0 END) / NULLIF(SUM(CASE WHEN status IN ('delivered','delayed','exception') THEN 1 ELSE 0 END), 0)", outputLabel: 'on_time_rate', unit: 'percent' },
  delay_rate: { name: 'delay_rate', description: "Delay rate.", sqlAggregate: "SUM(CASE WHEN status IN ('delayed','exception') THEN 1.0 ELSE 0 END) / NULLIF(SUM(CASE WHEN status IN ('delivered','delayed','exception') THEN 1 ELSE 0 END), 0)", outputLabel: 'delay_rate', unit: 'percent' },
  avg_delivery_days: { name: 'avg_delivery_days', description: 'Mean delivery time in days.', sqlAggregate: "AVG(DATE_DIFF('day', order_date, delivery_date))", outputLabel: 'avg_delivery_days', unit: 'days' },
};

export const DIMENSIONS: Record<string, string> = {
  carrier: 'Carrier name.',
  region: 'Region.',
  product_category: 'Product category.',
  warehouse: 'Warehouse.',
  client_id: 'Client ID.',
  destination_city: 'Destination city.',
  status: 'Order status.',
};

export const FIELDS = ['carrier', 'region', 'product_category', 'warehouse', 'client_id', 'destination_city'] as const;

export const TIME_GRAINS = {
  day: "DATE_TRUNC('day', order_date)",
  week: "DATE_TRUNC('week', order_date)",
  month: "DATE_TRUNC('month', order_date)",
  year: "DATE_TRUNC('year', order_date)",
} as const;

export function getRegistrySummaryForPrompt(): string {
  const lines = ['METRICS:'];
  Object.values(METRICS).forEach(m => lines.push(`  - ${m.name} (${m.unit}): ${m.description}`));
  lines.push('', `FIELDS: ${FIELDS.join(', ')}`);
  lines.push('', `FILTERS: ${Object.keys(DIMENSIONS).join(', ')}`);
  lines.push('', 'TIME GRAINS: day, week, month, year, none');
  lines.push('', 'DATA WINDOW: 2025-01-01 to 2025-12-30');
  return lines.join('\n');
}

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Must be YYYY-MM-DD' });

export const FilterSchema = z.object({
  field: z.string().refine(val => val in DIMENSIONS, { message: 'Invalid field' }),
  op: z.enum(['eq', 'in']),
  value: z.any(),
}).refine(d => (d.op === 'in' ? Array.isArray(d.value) : !Array.isArray(d.value)), {
  message: "'in' requires array; 'eq' requires scalar.",
});

export const QueryMetricInputSchema = z.object({
  metric: z.string().refine(val => val in METRICS, { message: 'Unknown metric' }),
  fields: z.enum(FIELDS).nullable().optional(),
  time_grain: z.enum(['day', 'week', 'month', 'year', 'none']).default('none'),
  filters: z.array(FilterSchema).default([]),
  date_from: dateStr.nullable().optional(),
  date_to: dateStr.nullable().optional(),
  limit: z.number().int().min(1).max(1000).default(100),
}).refine(d => !(d.date_from && d.date_to && d.date_from > d.date_to), {
  message: 'date_from must precede date_to.',
});

export type QueryMetricInput = z.infer<typeof QueryMetricInputSchema>;

export const ForecastInputSchema = z.object({
  grain: z.literal('product_category').default('product_category'),
  entity: z.string().min(1, { message: 'Entity cannot be empty.' }),
  horizon_months: z.number().int().min(1).max(6),
  method: z.enum(['auto', 'moving_average', 'linear_trend']).default('auto'),
});

export type ForecastInput = z.infer<typeof ForecastInputSchema>;