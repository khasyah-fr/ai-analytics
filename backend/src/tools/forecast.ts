import { queryAll } from '../repository/duckdb.ts';
import { BUFFER } from '../config/index.ts';

export interface ForecastInput {
  grain: 'product_category';
  entity: string;
  horizon_months: number;
  method: 'auto' | 'moving_average' | 'linear_trend' | 'holt_winters';
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

/**
 * Holt-Winters Additive Exponential Smoothing for a single 12-month period cycle
 */
export function fitHoltWinters(
  history: number[], 
  horizon: number, 
  alpha = 0.2, 
  beta = 0.1, 
  gamma = 0.3
) {
  const L = 12; // Seasonal period length (monthly cyclicality)
  const n = history.length;

  // Fallback if data is too short to extract baseline 12-month seasonality
  if (n < L) {
    return fitLinearTrend(history, horizon);
  }

  // 1. Initialization
  // Level (a0): Average of the first seasonal cycle
  let level = history.slice(0, L).reduce((sum, v) => sum + v, 0) / L;
  
  // Trend (b0): Simple initial approximation of slope across the first cycle
  let trend = (history[L - 1] - history[0]) / (L - 1);

  // Seasonal Indices (s): Deviations from the baseline average level
  const seasonal: number[] = new Array(L);
  for (let i = 0; i < L; i++) {
    seasonal[i] = history[i] - level;
  }

  // 2. Updating Equations (Running through history to smooth states)
  for (let i = 0; i < n; i++) {
    const y = history[i];
    const prevLevel = level;
    const prevSeasonal = seasonal[i % L];

    // Update Level, Trend, and Seasonality components
    level = alpha * (y - prevSeasonal) + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonal[i % L] = gamma * (y - level) + (1 - gamma) * prevSeasonal;
  }

  // 3. Forecasting Future Horizons
  const forecast: number[] = [];
  for (let m = 1; m <= horizon; m++) {
    // Determine target index within the 12-month cycle
    const seasonalIndex = (n + m - 1) % L;
    const val = level + m * trend + seasonal[seasonalIndex];
    forecast.push(Math.max(val, 0)); // Clip negative variations
  }

  return {
    forecast,
    params: {
      alpha,
      beta,
      gamma,
      final_level: parseFloat(level.toFixed(4)),
      final_trend: parseFloat(trend.toFixed(4)),
      history_len: n
    }
  };
}

export function fitQuadraticTrend(history: number[], horizon: number) {
  const n = history.length;

  // Fallback for insufficient data points to fit a quadratic curve safely
  if (n < 3) {
    return fitLinearTrend(history, horizon);
  }

  // Calculate sum combinations of x, x^2, x^3, x^4, y, xy, x^2y
  let sumX = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0;
  let sumY = 0, sumXY = 0, sumX2Y = 0;

  for (let x = 0; x < n; x++) {
    const y = history[x];
    const x2 = x * x;
    
    sumX += x;
    sumX2 += x2;
    sumX3 += x2 * x;
    sumX4 += x2 * x2;
    
    sumY += y;
    sumXY += x * y;
    sumX2Y += x2 * y;
  }

  // Set up the system of equations: M * A = Y via Cramer's Rule
  // [ n     sumX   sumX2 ]   [ beta_0 ]   [ sumY   ]
  // [ sumX  sumX2  sumX3 ] * [ beta_1 ] = [ sumXY  ]
  // [ sumX2 sumX3  sumX4 ]   [ beta_2 ]   [ sumX2Y ]
  
  const detM = 
    n * (sumX2 * sumX4 - sumX3 * sumX3) -
    sumX * (sumX * sumX4 - sumX2 * sumX3) +
    sumX2 * (sumX * sumX3 - sumX2 * sumX2);

  // If system is singular, fallback to standard linear regression
  if (Math.abs(detM) < 1e-6) {
    return fitLinearTrend(history, horizon);
  }

  const detA0 = 
    sumY * (sumX2 * sumX4 - sumX3 * sumX3) -
    sumX * (sumXY * sumX4 - sumX2Y * sumX3) +
    sumX2 * (sumXY * sumX3 - sumX2Y * sumX2);

  const detA1 = 
    n * (sumXY * sumX4 - sumX2Y * sumX3) -
    sumY * (sumX * sumX4 - sumX2 * sumX3) +
    sumX2 * (sumX * sumX2Y - sumX2 * sumXY);

  const detA2 = 
    n * (sumX2 * sumX2Y - sumX3 * sumXY) -
    sumX * (sumX * sumX2Y - sumX2 * sumXY) +
    sumY * (sumX * sumX3 - sumX2 * sumX2);

  const beta0 = detA0 / detM; // Intercept
  const beta1 = detA1 / detM; // Linear slope coefficient
  const beta2 = detA2 / detM; // Quadratic acceleration coefficient

  // Evaluate fitness (R²)
  let sumYMean = sumY / n;
  let ssRes = 0;
  let ssTot = 0;
  
  for (let x = 0; x < n; x++) {
    const y = history[x];
    const fitted = beta0 + beta1 * x + beta2 * (x * x);
    ssRes += Math.pow(y - fitted, 2);
    ssTot += Math.pow(y - sumYMean, 2);
  }
  const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

  // Generate projections
  const forecast: number[] = [];
  for (let i = 0; i < horizon; i++) {
    const targetX = n + i;
    const predicted = beta0 + beta1 * targetX + beta2 * (targetX * targetX);
    forecast.push(Math.max(predicted, 0)); // Lower bound guard rail
  }

  return {
    forecast,
    params: {
      beta_0: parseFloat(beta0.toFixed(4)),
      beta_1: parseFloat(beta1.toFixed(4)),
      beta_2: parseFloat(beta2.toFixed(4)),
      r2: parseFloat(r2.toFixed(4)),
      history_len: n
    }
  };
}

export async function runForecast(input: ForecastInput) {
  const categories = await listCategories();
  if (!categories.includes(input.entity)) {
    throw new Error(`Unknown category '${input.entity}'. Options: [${categories.join(', ')}]. SKU-level unsupported.`);
  }

  const history = await loadMonthlySeries(input.entity);
  const activeMonths = history.filter(c => c > 0).length;
  
  // Update router to respect explicit holt_winters selection, or auto fallback
  let methodUsed = input.method;
  if (methodUsed === 'auto') {
    methodUsed = activeMonths >= 12 ? 'holt_winters' : (activeMonths >= 6 ? 'linear_trend' : 'moving_average');
  }

  let forecastArr: number[];
  let params: Record<string, any>;
  let label = '';

  if (methodUsed === 'holt_winters') {
    const res = fitHoltWinters(history, input.horizon_months);
    forecastArr = res.forecast; params = res.params; label = 'Holt-Winters additive exponential smoothing';
  } else if (methodUsed === 'linear_trend') {
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
  const rec = Math.max(1, Math.ceil(total * (1.0 + BUFFER)));

  let methodology = `Forecast for ${input.entity} over ${input.horizon_months}m using ${label}. Rec = ceil(sum_forecast × ${(1 + BUFFER).toFixed(2)}) = ${rec}. `;
  
  if (methodUsed === 'holt_winters') {
    methodology += `α=${params.alpha}, β=${params.beta}, γ=${params.gamma}. Captured monthly seasonality factors.`;
  } else if (methodUsed === 'linear_trend') {
    methodology += `R²=${params.r2.toFixed(2)} (slope=${params.slope >= 0 ? '+' : ''}${params.slope.toFixed(2)}). No cyclic seasonality handling.`;
  } else if (methodUsed === 'moving_average') {
    methodology += `Window Avg=${params.window_avg.toFixed(2)}. No cyclic seasonality handling.`;
  }

  return {
    historical,
    forecast,
    inventory_recommendation: rec,
    methodology,
    plan: { grain: input.grain, entity: input.entity, horizon_months: input.horizon_months, method_used: methodUsed, params }
  };
}