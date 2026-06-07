import express from 'express';
import cors from 'cors';
import { PORT, ALLOW_CORS } from './config/index.js';
import { initDb, getRowCount } from './repository/duckdb.js';

import { requireAuth } from './middleware/auth.js';
import analyticsRouter from './handler/analytics.js';
import chartRouter from './handler/charts.js';
import askRouter from './handler/ask.js';

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const app = express();

app.use(cors({ origin: ALLOW_CORS, credentials: false }));
app.use(express.json());

app.use(requireAuth);

app.use(analyticsRouter);
app.use(chartRouter);
app.use(askRouter);

app.get('/api/health', async (req, res) => {
  try {
    const rows = await getRowCount();
    res.json({ status: 'ok', rows });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

async function bootstrap() {
  try {
    await initDb();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Server bootstrap failed:', err);
    process.exit(1);
  }
}

bootstrap();