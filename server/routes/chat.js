import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../db/db.js';

const router = Router();

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

function isKeyConfigured() {
  const k = process.env.ANTHROPIC_API_KEY;
  return !!(k && !k.startsWith('your_') && !k.endsWith('_here'));
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// Build a compact JSON snapshot of the current data so Claude can answer
// questions accurately without us shipping the whole DB.
function buildDataSnapshot() {
  const db = getDb();

  const totals30 = db.prepare(`
    SELECT
      ROUND(COALESCE(SUM(total_amount), 0), 2) AS revenue,
      COUNT(*) AS orders
    FROM orders
    WHERE ordered_at >= @cutoff AND status NOT IN ('cancelled','refunded')
  `).get({ cutoff: isoDaysAgo(30) });

  const byPlatform30 = db.prepare(`
    SELECT platform_id,
           ROUND(COALESCE(SUM(total_amount),0),2) AS revenue,
           COUNT(*) AS orders
    FROM orders
    WHERE ordered_at >= @cutoff AND status NOT IN ('cancelled','refunded')
    GROUP BY platform_id
  `).all({ cutoff: isoDaysAgo(30) });

  const topProducts = db.prepare(`
    SELECT p.title, p.category, p.platform_id,
           ROUND(SUM(json_extract(j.value,'$.price') * json_extract(j.value,'$.qty')),2) AS revenue,
           SUM(json_extract(j.value,'$.qty')) AS units
    FROM orders o, json_each(o.items) j
    JOIN products p ON p.id = json_extract(j.value,'$.product_id')
    WHERE o.status NOT IN ('cancelled','refunded')
    GROUP BY p.id
    ORDER BY revenue DESC
    LIMIT 5
  `).all();

  const lowStock = db.prepare(`
    SELECT title, platform_id, inventory_qty FROM products
    WHERE status = 'active' AND inventory_qty <= 3
    ORDER BY inventory_qty ASC LIMIT 10
  `).all();

  const platforms = db.prepare(`
    SELECT id, name, status, last_sync FROM platforms ORDER BY id
  `).all();

  const orderTrend = db.prepare(`
    SELECT strftime('%Y-%m-%d', ordered_at) AS day, COUNT(*) AS orders,
           ROUND(SUM(total_amount), 2) AS revenue
    FROM orders
    WHERE ordered_at >= @cutoff AND status NOT IN ('cancelled','refunded')
    GROUP BY day ORDER BY day ASC
  `).all({ cutoff: isoDaysAgo(14) });

  const customerCount = db.prepare(`SELECT COUNT(*) AS count FROM customers`).get().count;
  const productCount  = db.prepare(`SELECT COUNT(*) AS count FROM products WHERE status='active'`).get().count;

  return {
    generated_at: new Date().toISOString(),
    last_30_days: totals30,
    revenue_by_platform_30d: byPlatform30,
    top_products_all_time: topProducts,
    low_stock_alerts: lowStock,
    platforms,
    recent_daily_trend: orderTrend,
    counts: { active_products: productCount, customers: customerCount },
  };
}

const SYSTEM_TEMPLATE = (snapshotJson) => `You are the Jewelry Authority AI Analyst, embedded in a commerce intelligence dashboard for a jewelry retailer. You answer questions about the business by interpreting the live data snapshot provided below.

Rules:
- Be concise (2-6 sentences) unless asked for detail.
- Always cite numbers from the snapshot when relevant.
- If asked something the snapshot doesn't cover, say so plainly.
- Use plain currency formatting like "$12,345".
- Refer to platforms by name: eBay, Shopify, Business Website, Salesforce.

Current data snapshot (JSON):
${snapshotJson}`;

router.post('/', async (req, res) => {
  if (!isKeyConfigured()) {
    return res.status(503).json({
      error: 'Anthropic API key not configured',
      code: 'NOT_CONFIGURED',
      hint: 'Add ANTHROPIC_API_KEY to your .env file. See API_KEYS.md.',
    });
  }

  const { messages, sessionId } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages[] is required' });
  }

  const snapshot = buildDataSnapshot();
  const system   = SYSTEM_TEMPLATE(JSON.stringify(snapshot, null, 2));

  // Normalize messages to Anthropic format
  const apiMessages = messages
    .filter((m) => m && m.role && m.content)
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) }));

  const db = getDb();

  try {
    // Persist the latest user turn inside the try so orphaned rows don't appear on error
    if (sessionId) {
      const last = apiMessages[apiMessages.length - 1];
      if (last && last.role === 'user') {
        db.prepare(`INSERT INTO chat_messages (role, content, session_id) VALUES (?, ?, ?)`)
          .run('user', last.content, sessionId);
      }
    }
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const completion = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: apiMessages,
    });

    const text = (completion.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    if (sessionId) {
      db.prepare(`INSERT INTO chat_messages (role, content, session_id) VALUES (?, ?, ?)`)
        .run('assistant', text, sessionId);
    }

    res.json({
      message: { role: 'assistant', content: text },
      usage: completion.usage,
      model: completion.model,
    });
  } catch (err) {
    // Log the safe summary only — SDK errors can contain request headers/metadata
    console.error('[chat] anthropic error:', err?.status ?? err?.constructor?.name ?? 'unknown', err?.message);
    res.status(502).json({
      error: 'AI service unavailable. Please try again shortly.',
      code: 'AI_UNAVAILABLE',
    });
  }
});

router.get('/history', (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.json({ messages: [] });
  const rows = getDb().prepare(
    `SELECT role, content, created_at FROM chat_messages WHERE session_id = ? ORDER BY id ASC`
  ).all(sessionId);
  res.json({ messages: rows });
});

router.delete('/history', (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  getDb().prepare('DELETE FROM chat_messages WHERE session_id = ?').run(sessionId);
  res.json({ ok: true });
});

router.get('/status', (_req, res) => {
  res.json({ configured: isKeyConfigured(), model: MODEL });
});

export default router;
