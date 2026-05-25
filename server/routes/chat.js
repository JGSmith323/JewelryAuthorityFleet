import { Router } from 'express';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { getDb } from '../db/db.js';
import { isDemoMode } from '../db/seed-demo.js';

const router = Router();
const execAsync = promisify(execFile);

// ── PATH augmentation ──────────────────────────────────────────────────────
const EXTRA_PATHS = [
  `${process.env.HOME ?? '/root'}/.local/bin`,
  '/usr/local/bin',
  '/opt/homebrew/bin',
  '/opt/homebrew/sbin',
  '/usr/bin',
].join(':');

const CHILD_ENV = (() => {
  const env = { ...process.env, PATH: `${EXTRA_PATHS}:${process.env.PATH ?? ''}` };
  const key = env.ANTHROPIC_API_KEY;
  if (!key || key.startsWith('your_') || key === 'sk-placeholder' || !key.trim()) {
    delete env.ANTHROPIC_API_KEY;
  }
  return env;
})();

// ── CLI availability check ─────────────────────────────────────────────────
async function isCliAvailable() {
  try {
    await execAsync('claude', ['--version'], { timeout: 5_000, env: CHILD_ENV });
    return true;
  } catch {
    return false;
  }
}

// ── Data snapshot ──────────────────────────────────────────────────────────
function isoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function buildDataSnapshot() {
  const db = getDb();

  const totals30 = db.prepare(`
    SELECT ROUND(COALESCE(SUM(total_amount), 0), 2) AS revenue, COUNT(*) AS orders
    FROM orders
    WHERE ordered_at >= @cutoff AND status NOT IN ('cancelled','refunded')
  `).get({ cutoff: isoDaysAgo(30) });

  const byPlatform30 = db.prepare(`
    SELECT platform_id,
           ROUND(COALESCE(SUM(total_amount), 0), 2) AS revenue,
           COUNT(*) AS orders
    FROM orders
    WHERE ordered_at >= @cutoff AND status NOT IN ('cancelled','refunded')
    GROUP BY platform_id
  `).all({ cutoff: isoDaysAgo(30) });

  const topProducts = db.prepare(`
    SELECT p.title, p.category, p.platform_id,
           ROUND(SUM(json_extract(j.value,'$.price') * json_extract(j.value,'$.qty')), 2) AS revenue,
           SUM(json_extract(j.value,'$.qty')) AS units
    FROM orders o, json_each(o.items) j
    JOIN products p ON p.id = json_extract(j.value,'$.product_id')
    WHERE o.status NOT IN ('cancelled','refunded')
    GROUP BY p.id ORDER BY revenue DESC LIMIT 5
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
    SELECT strftime('%Y-%m-%d', ordered_at) AS day,
           COUNT(*) AS orders,
           ROUND(SUM(total_amount), 2) AS revenue
    FROM orders
    WHERE ordered_at >= @cutoff AND status NOT IN ('cancelled','refunded')
    GROUP BY day ORDER BY day ASC
  `).all({ cutoff: isoDaysAgo(14) });

  const customerCount = db.prepare(`SELECT COUNT(*) AS count FROM customers`).get().count;
  const productCount  = db.prepare(`SELECT COUNT(*) AS count FROM products WHERE status='active'`).get().count;

  const demoMode = isDemoMode();
  return {
    generated_at: new Date().toISOString(),
    data_source: demoMode
      ? 'DEMO MODE — sample/fictional data for demonstration purposes'
      : 'LIVE production data',
    last_30_days: totals30,
    revenue_by_platform_30d: byPlatform30,
    top_products_all_time: topProducts,
    low_stock_alerts: lowStock,
    platforms,
    recent_daily_trend: orderTrend,
    counts: { active_products: productCount, customers: customerCount },
  };
}

// ── Prompt builder ─────────────────────────────────────────────────────────
function buildPrompt(messages, snapshot) {
  const isDemo = snapshot?.data_source?.includes('DEMO');
  const system = `You are the Jewelry Authority AI Analyst, embedded in a commerce intelligence dashboard for a jewelry retail business. Answer questions about the business using the data snapshot below.

${isDemo
  ? '⚠️  IMPORTANT: The dashboard is currently in DEMO MODE. All figures below are fictional sample data for demonstration purposes. Mention this naturally when relevant (e.g. "In the demo data..." or "Based on the sample data...") but do not repeat it on every sentence.'
  : 'You are working with LIVE production data.'}

Rules:
- Be conversational and helpful — like a smart business analyst, not a robot.
- Cite specific numbers from the snapshot when relevant.
- Keep answers concise (2–5 sentences) unless asked for detail.
- Format currency as "$12,345".
- Refer to platforms by name: eBay, Shopify, Business Website, Salesforce.
- If asked something the snapshot does not cover, say so plainly.

Current data snapshot (JSON):
${JSON.stringify(snapshot, null, 2)}

---`;

  const turns = messages
    .filter((m) => m?.role && m?.content)
    .map((m) => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  return `${system}\n\n${turns}\n\nAssistant:`;
}

// ── Routes ─────────────────────────────────────────────────────────────────

// GET /api/chat/status
router.get('/status', async (_req, res) => {
  const available = await isCliAvailable();
  res.json({ configured: available, engine: 'claude-agent-sdk' });
});

// POST /api/chat — stream claude output directly as plain-text chunked response
router.post('/', async (req, res) => {
  const { messages, sessionId } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages[] is required' });
  }

  let snapshot = { generated_at: new Date().toISOString() };
  try { snapshot = buildDataSnapshot(); }
  catch (e) { console.error('[chat] snapshot error:', e?.message); }

  const prompt = buildPrompt(messages, snapshot);
  const db     = getDb();

  // Persist user turn
  const last = messages[messages.length - 1];
  if (sessionId && last?.role === 'user') {
    db.prepare(`INSERT INTO chat_messages (role, content, session_id) VALUES (?, ?, ?)`)
      .run('user', last.content, sessionId);
  }

  // Set streaming headers before spawning
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Content-Encoding', 'identity');
  res.flushHeaders();

  const proc = spawn('claude', ['-p'], { env: CHILD_ENV });
  // Write prompt via stdin (avoids OS arg-length limits on large data snapshots)
  proc.stdin.write(prompt);
  proc.stdin.end();

  let assistantText = '';
  let finished = false;

  // 90-second hard timeout
  const timeout = setTimeout(() => {
    if (!finished) {
      finished = true;
      proc.kill();
      if (!res.writableEnded) {
        res.write('\n[Response timed out after 90 seconds]');
        res.end();
      }
    }
  }, 90_000);

  // Kill proc if client disconnects early
  // Use res 'close' instead of req 'close' — fires only on actual client disconnect
  res.on('close', () => {
    if (!finished) {
      finished = true;
      clearTimeout(timeout);
      proc.kill();
    }
  });

  proc.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    assistantText += text;
    if (!res.writableEnded) res.write(chunk);
  });

  proc.stderr.on('data', (chunk) => {
    console.error('[chat:stderr]', chunk.toString());
  });

  proc.on('close', (code) => {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);

    if (code !== 0 && !assistantText) {
      const msg = `[AI service error — exit code ${code}]`;
      if (!res.writableEnded) res.write(msg);
      assistantText = msg;
    }

    if (!res.writableEnded) res.end();

    // Persist assistant response
    if (sessionId && assistantText.trim()) {
      try {
        db.prepare(`INSERT INTO chat_messages (role, content, session_id) VALUES (?, ?, ?)`)
          .run('assistant', assistantText.trim(), sessionId);
      } catch (e) {
        console.error('[chat] persist assistant error:', e?.message);
      }
    }
  });

  proc.on('error', (err) => {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    console.error('[chat] spawn error:', err.message);
    const msg = `[Failed to start AI service: ${err.message}]`;
    if (!res.writableEnded) {
      res.write(msg);
      res.end();
    }
  });
});

// GET /api/chat/history
router.get('/history', (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.json({ messages: [] });
  const rows = getDb().prepare(
    `SELECT role, content, created_at FROM chat_messages WHERE session_id = ? ORDER BY id ASC`
  ).all(sessionId);
  res.json({ messages: rows });
});

// DELETE /api/chat/history
router.delete('/history', (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  getDb().prepare('DELETE FROM chat_messages WHERE session_id = ?').run(sessionId);
  res.json({ ok: true });
});

export default router;
