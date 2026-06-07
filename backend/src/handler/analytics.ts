import { Router } from 'express';
import { runQueryMetric } from '../tools/query.js';

const router = Router();

const ANALYTICS_METRICS = [
  'total_orders',
  'delivered_orders',
  'delayed_orders',
  'in_transit_orders',
  'exception_orders',
  'canceled_orders',
  'on_time_rate',
  'avg_delivery_days',
];

router.get('/api/analytics', async (req, res) => {
  try {
    const records: Record<string, any> = {};
    
    await Promise.all(
      ANALYTICS_METRICS.map(async (metric) => {
        const payload = await runQueryMetric({ metric, time_grain: 'none', filters: [] });
        records[metric] = payload.rows[0]?.[metric] ?? null;
      })
    );

    res.json(records);
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

export default router;