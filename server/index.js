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
const PORT = Number(process.env.PORT) || 5178;
const HOST = process.env.HOST || '0.0.0.0';

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5178,http://127.0.0.1:5178'
).split(',').map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin, listed origins, and Tailscale MagicDNS hosts
    if (!origin || ALLOWED_ORIGINS.includes(origin) || /\.ts\.net(:\d+)?$/.test(origin)) {
      return cb(null, true);
    }
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
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

// Serve the production React build (always — Vite dev server used separately in dev)
const distPath = path.resolve(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { maxAge: '1d', etag: true }));
  // SPA catch-all: all non-API routes return index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

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
  res.status(500).json({ error: 'An internal server error occurred. Check server logs for details.' });
});

app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
});

export default app;
