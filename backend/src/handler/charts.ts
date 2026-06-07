import { Router } from 'express';
import { queryAll } from '../repository/duckdb.js';
import { runQueryMetric } from '../tools/query.js';

const router = Router();

router.get('/api/charts/volume_over_time', async (req, res, next) => {
  try {
    const data = await runQueryMetric({ metric: 'total_orders', time_grain: 'month', filters: [] });
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

export default router;