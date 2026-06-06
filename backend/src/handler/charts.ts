import { Router } from 'express';
import { queryAll } from '../repository/duckdb.ts';
import { runQueryMetric } from '../tools/query.ts';

const router = Router();

router.get('/api/charts/volume_over_time', async (req, res, next) => {
  try {
    const data = await runQueryMetric({ metric: 'total_orders', time_grain: 'month', filters: [] });
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/api/charts/on_time_rate_trend', async (req, res, next) => {
  try {
    const data = await runQueryMetric({ metric: 'on_time_rate', time_grain: 'month', filters: [] });
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/api/charts/delay_rate_by_region', async (req, res, next) => {
  try {
    const data = await runQueryMetric({ metric: 'delay_rate', breakdown: 'region', time_grain: 'none', filters: [] });
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/api/charts/delivery_status', async (req, res, next) => {
  try {
    const rows = await queryAll("SELECT status, COUNT(*) AS orders FROM orders GROUP BY status ORDER BY orders DESC;");
    res.json({
      rows,
      viz_spec: { type: 'bar', x: 'status', y: 'orders', y_unit: 'count' }
    });
  } catch (err) { next(err); }
});

router.get('/api/charts/carrier_delay_rate', async (req, res, next) => {
  try {
    const rows = await queryAll(`
      SELECT carrier,
        SUM(CASE WHEN status IN ('delayed','exception') THEN 1.0 ELSE 0 END) / 
        NULLIF(SUM(CASE WHEN status IN ('delivered','delayed','exception') THEN 1 ELSE 0 END), 0) AS delay_rate
      FROM orders GROUP BY carrier ORDER BY delay_rate DESC;
    `);
    res.json({
      rows,
      viz_spec: { type: 'bar', x: 'carrier', y: 'delay_rate', y_unit: 'percent' }
    });
  } catch (err) { next(err); }
});

router.get('/api/charts/client_revenue_concentration', async (req, res, next) => {
  try {
    const rows = await queryAll(`
      SELECT client_id, ROUND(SUM(order_value_usd), 2) AS revenue_usd,
        SUM(CASE WHEN status IN ('delayed','exception') THEN 1.0 ELSE 0 END) / 
        NULLIF(SUM(CASE WHEN status IN ('delivered','delayed','exception') THEN 1 ELSE 0 END), 0) AS delay_rate
      FROM orders GROUP BY client_id ORDER BY revenue_usd DESC LIMIT 10;
    `);
    res.json({
      rows,
      viz_spec: { type: 'bar', x: 'client_id', y: 'revenue_usd', y_unit: 'usd' }
    });
  } catch (err) { next(err); }
});

export default router;