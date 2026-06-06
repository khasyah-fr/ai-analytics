import { queryAll } from '../repository/duckdb.ts';
import { SAFETY_STOCK_PCT } from '../config/index.ts';

export interface ForecastInput {
  grain: 'product_category';
  entity: string;
  horizon_months: number;
  method: 'auto' | 'moving_average' | 'linear_trend';
}

async function listCategories(): Promise<string[]> {
  const rows = await queryAll('SELECT DISTINCT product_category FROM orders ORDER BY 1;');
  return rows.map(r => r.product_category);
}

async function loadMonthlySeries(category: string): Promise<number[]> {
  const rawRows = await queryAll(`
    SELECT DATE_TRUNC('month', order_date) AS month, COUNT(*) AS orders
    FROM orders WHERE product_category = ? GROUP BY 1 ORDER BY 1;
  `, [category]);

  const series = new Array(12).fill(0);
  rawRows.forEach(row => {
    const d = row.month instanceof Date ? row.month : new Date(row.month);
    if (d.getFullYear() === 2025) {
      series[d.getMonth()] = Number(row.orders);
    }
  });
  return series;
}

export function fitLinearTrend(history: number[], horizon: number) {
  const n = history.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (let x = 0; x < n; x++) {
    const y = history[x];
    sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;
  const num = sumXY - (sumX * sumY) / n;
  const den = sumXX - (sumX * sumX) / n;
  
  const slope = den !== 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;

  let ssRes = 0, ssTot = 0;
  for (let x = 0; x < n; x++) {
    const y = history[x];
    const fitted = slope * x + intercept;
    ssRes += Math.pow(y - fitted, 2);
    ssTot += Math.pow(y - meanY, 2);
  }
  const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

  const forecast: number[] = [];
  for (let i = 0; i < horizon; i++) {
    forecast.push(Math.max(slope * (n + i) + intercept, 0));
  }

  return {
    forecast,
    params: { slope: parseFloat(slope.toFixed(4)), intercept: parseFloat(intercept.toFixed(4)), r2: parseFloat(r2.toFixed(4)), history_len: n }
  };
}

export function fitMovingAverage(history: number[], horizon: number, size = 3) {
  const tail = history.slice(-size);
  const avg = tail.length > 0 ? tail.reduce((acc, v) => acc + v, 0) / tail.length : 0;
  return {
    forecast: new Array(horizon).fill(Math.max(avg, 0)),
    params: { window_months: size, window_avg: parseFloat(avg.toFixed(4)), history_len: history.length }
  };
}

export async function runForecast(input: ForecastInput) {
  const categories = await listCategories();
  if (!categories.includes(input.entity)) {
    throw new Error(`Unknown category '${input.entity}'. Options: [${categories.join(', ')}]. SKU-level unsupported.`);
  }

  const history = await loadMonthlySeries(input.entity);
  const activeMonths = history.filter(c => c > 0).length;
  const methodUsed = input.method === 'auto' ? (activeMonths >= 6 ? 'linear_trend' : 'moving_average') : input.method;

  let forecastArr: number[];
  let params: Record<string, any>;
  let label = '';

  if (methodUsed === 'linear_trend') {
    const res = fitLinearTrend(history, input.horizon_months);
    forecastArr = res.forecast; params = res.params; label = 'linear trend';
  } else {
    const res = fitMovingAverage(history, input.horizon_months);
    forecastArr = res.forecast; params = res.params; label = `moving average (w=${params.window_months})`;
  }

  const historical = history.map((val, idx) => ({
    period: `2025-${String(idx + 1).padStart(2, '0')}-01`,
    value: val
  }));

  const forecast = forecastArr.map((val, idx) => ({
    period: `2026-${String(idx + 1).padStart(2, '0')}-01`,
    value: parseFloat(val.toFixed(2))
  }));

  const total = forecastArr.reduce((acc, v) => acc + v, 0);
  const rec = Math.max(1, Math.ceil(total * (1.0 + SAFETY_STOCK_PCT)));

  let methodology = `Forecast for ${input.entity} over ${input.horizon_months}m using ${label}. Rec = ceil(sum_forecast × ${(1 + SAFETY_STOCK_PCT).toFixed(2)}) = ${rec}. `;
  methodology += 'r2' in params 
    ? `R²=${params.r2.toFixed(2)} (slope=${params.slope >= 0 ? '+' : ''}${params.slope.toFixed(2)}). ` 
    : `Window Avg=${params.window_avg.toFixed(2)}. `;
  methodology += 'No cyclic seasonality handling.';

  return {
    historical,
    forecast,
    inventory_recommendation: rec,
    methodology,
    plan: { grain: input.grain, entity: input.entity, horizon_months: input.horizon_months, method_used: methodUsed, params }
  };
}