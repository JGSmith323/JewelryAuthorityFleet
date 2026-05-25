import { Router } from 'express';
import { getDb } from '../db/db.js';
import { hydrate, PLATFORM_IDS } from './_util.js';
import * as ebay from '../services/ebay.js';
import * as shopify from '../services/shopify.js';
import * as website from '../services/website.js';
import * as salesforce from '../services/salesforce.js';

const router = Router();

const SERVICES = { ebay, shopify, website, salesforce };

router.get('/', (_req, res) => {
  const rows = getDb().prepare('SELECT * FROM platforms ORDER BY id').all();
  const enriched = rows.map((r) => ({
    ...hydrate(r, ['config']),
    configured: SERVICES[r.id]?.isConfigured?.() ?? false,
  }));
  res.json({ platforms: enriched });
});

router.get('/:id/logs', (req, res) => {
  if (!PLATFORM_IDS.includes(req.params.id)) return res.status(404).json({ error: 'Unknown platform' });
  const logs = getDb().prepare(
    'SELECT * FROM sync_logs WHERE platform_id = ? ORDER BY started_at DESC LIMIT 50'
  ).all(req.params.id);
  res.json({ logs });
});

router.post('/:id/sync', async (req, res) => {
  const id = req.params.id;
  if (!PLATFORM_IDS.includes(id)) return res.status(404).json({ error: 'Unknown platform' });
  const svc = SERVICES[id];
  const startedAt = new Date().toISOString();
  const db = getDb();

  if (!svc.isConfigured()) {
    db.prepare(`
      INSERT INTO sync_logs (platform_id, status, records_synced, error_message, started_at, completed_at)
      VALUES (?, 'error', 0, ?, ?, CURRENT_TIMESTAMP)
    `).run(id, 'Credentials not configured', startedAt);
    return res.status(503).json({
      error: `${id} not configured`,
      code: 'NOT_CONFIGURED',
      platform: id,
    });
  }

  try {
    // Real implementation would pull and persist records here.
    db.prepare(`
      INSERT INTO sync_logs (platform_id, status, records_synced, started_at, completed_at)
      VALUES (?, 'success', 0, ?, CURRENT_TIMESTAMP)
    `).run(id, startedAt);
    db.prepare(`UPDATE platforms SET status = 'connected', last_sync = CURRENT_TIMESTAMP WHERE id = ?`).run(id);
    res.json({ ok: true });
  } catch (err) {
    db.prepare(`
      INSERT INTO sync_logs (platform_id, status, records_synced, error_message, started_at, completed_at)
      VALUES (?, 'error', 0, ?, ?, CURRENT_TIMESTAMP)
    `).run(id, err.message, startedAt);
    res.status(500).json({ error: err.message });
  }
});

export default router;
