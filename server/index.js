import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import { initSchema } from './db/schema.js';
import productsRoute   from './routes/products.js';
import ordersRoute     from './routes/orders.js';
import customersRoute  from './routes/customers.js';
import analyticsRoute  from './routes/analytics.js';
import platformsRoute  from './routes/platforms.js';
import demoRoute       from './routes/demo.js';
import chatRoute       from './routes/chat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve .env from the repo root regardless of cwd
const rootEnv = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(rootEnv)) {
  // dotenv/config already ran but only against cwd; reload root explicitly
  const dotenv = await import('dotenv');
  dotenv.config({ path: rootEnv, override: false });
}

initSchema();

const app  = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/products',   productsRoute);
app.use('/api/orders',     ordersRoute);
app.use('/api/customers',  customersRoute);
app.use('/api/analytics',  analyticsRoute);
app.use('/api/platforms',  platformsRoute);
app.use('/api/demo',       demoRoute);
app.use('/api/chat',       chatRoute);

// JSON 404 for unknown /api/*
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Centralized error handler
app.use((err, _req, res, _next) => {
  if (err?.code === 'NOT_CONFIGURED') {
    return res.status(503).json({
      error: err.message,
      code: 'NOT_CONFIGURED',
      platform: err.platform,
    });
  }
  console.error('[error]', err);
  res.status(500).json({ error: err?.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://127.0.0.1:${PORT}`);
});

export default app;
