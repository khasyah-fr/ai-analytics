import { queryAll } from '../repository/duckdb.ts';
import { METRICS, TIME_GRAINS, QueryMetricInputSchema, QueryMetricInput } from '../repository/zod.ts';

function buildWhere(input: QueryMetricInput) {
  const clauses: string[] = [];
  const params: any[] = [];

  for (const f of input.filters) {
    if (f.op === 'eq') {
      clauses.push(`${f.field} = ?`);
      params.push(f.value);
    } else if (f.op === 'in') {
      const placeholders = (f.value as any[]).map(() => '?').join(',');
      clauses.push(`${f.field} IN (${placeholders})`);
      params.push(...f.value);
    }
  }

  if (input.date_from) { clauses.push('order_date >= ?'); params.push(input.date_from); }
  if (input.date_to) { clauses.push('order_date <= ?'); params.push(input.date_to); }

  return {
    sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

export async function runQueryMetric(rawInput: Partial<QueryMetricInput> & { metric: string }) {
  const input = QueryMetricInputSchema.parse(rawInput);
  const metric = METRICS[input.metric];
  
  const select: string[] = [];
  const group: string[] = [];
  const order: string[] = [];

  const hasTime = input.time_grain && input.time_grain !== 'none';

  if (hasTime) {
    const expr = TIME_GRAINS[input.time_grain as keyof typeof TIME_GRAINS];
    select.push(`${expr} AS period`);
    group.push(expr);
    order.push('period');
  }

  if (input.fields) {
    select.push(input.fields);
    group.push(input.fields);
    order.push(input.fields);
  }

  select.push(`${metric.sqlAggregate} AS ${metric.outputLabel}`);

  const { sql: whereSql, params } = buildWhere(input);
  
  let sql = `SELECT ${select.join(', ')} FROM orders ${whereSql}`.trim();
  if (group.length) sql += ` GROUP BY ${group.join(', ')}`;
  if (order.length) sql += ` ORDER BY ${order.join(', ')}`;
  sql += ` LIMIT ${input.limit}`;

  const start = performance.now();
  const rawRows = await queryAll(sql, params);
  const ms = performance.now() - start;

  const rows = rawRows.map(row => {
    const formatted: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      formatted[k] = v instanceof Date ? v.toISOString().split('T')[0] : v;
    }
    return formatted;
  });

  const type = hasTime ? 'line' : input.fields ? 'bar' : 'number';

  return {
    rows,
    plan: {
      metric: input.metric,
      fields: input.fields || null,
      time_grain: input.time_grain,
      filters: input.filters,
      date_from: input.date_from || null,
      date_to: input.date_to || null,
      sql,
      execution_ms: parseFloat(ms.toFixed(2)),
    },
    viz_spec: {
      type,
      x: hasTime ? 'period' : (input.fields || null),
      y: metric.outputLabel,
      series: hasTime ? (input.fields || null) : null,
      y_unit: metric.unit,
      time_grain: input.time_grain,
    },
  };
}