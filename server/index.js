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
  const dotenv = await import('dotenv');
  dotenv.config({ path: rootEnv, override: false });
}

initSchema();

const app  = express();
const PORT = Number(process.env.PORT) || 5179;
const HOST = process.env.HOST || '0.0.0.0';

// ── Host / Origin allowlist ───────────────────────────────────────────────────
// Mirrors the ticket-triage pattern exactly.
// EXTRA_ALLOWED_HOSTS is a comma-separated list injected by the systemd unit
// (e.g. the Tailscale MagicDNS hostname, short name, and Tailscale IP).
const EXTRA_HOSTS = (process.env.EXTRA_ALLOWED_HOSTS ?? '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const HOSTS_OK = new Set(['127.0.0.1', 'localhost', ...EXTRA_HOSTS]);

const ORIGINS_OK = new Set([
  `http://127.0.0.1:${PORT}`,
  `http://localhost:${PORT}`,
  // Vite dev server origins
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  ...EXTRA_HOSTS.map(h => `http://${h}:${PORT}`),
  ...EXTRA_HOSTS.map(h => `https://${h}:${PORT}`),
  // Allow bare HTTPS on standard port (Tailscale cert)
  ...EXTRA_HOSTS.map(h => `https://${h}`),
]);

function isAllowedHost(rawHost) {
  if (!rawHost) return false;
  const host = rawHost.replace(/:\d+$/, '').toLowerCase();
  return HOSTS_OK.has(host);
}

function isAllowedOrigin(origin) {
  if (!origin) return true; // no Origin = CLI / curl — allow
  return ORIGINS_OK.has(origin);
}

// CORS for preflight (OPTIONS). The host/origin middleware below handles the rest.
app.use(cors({
  origin: (origin, cb) => {
    if (isAllowedOrigin(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// ── Host + Origin guard ───────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (!isAllowedHost(req.headers.host)) {
    return res.status(403).json({ error: 'forbidden host' });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const origin = req.headers.origin;
    if (origin && !isAllowedOrigin(origin)) {
      return res.status(403).json({ error: 'forbidden origin' });
    }
  }
  next();
});

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

// ── Serve production React build ──────────────────────────────────────────────
const distPath = path.resolve(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { maxAge: '1d', etag: true }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── Centralized error handler ─────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  if (err?.code === 'NOT_CONFIGURED') {
    return res.status(503).json({
      error: err.message,
      code: 'NOT_CONFIGURED',
      platform: err.platform,
    });
  }
  console.error('[error]', err);
  res.status(500).json({ error: 'An internal server error occurred.' });
});

app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
  if (EXTRA_HOSTS.length) console.log(`[server] Tailscale hosts: ${EXTRA_HOSTS.join(', ')}`);
});

export default app;
