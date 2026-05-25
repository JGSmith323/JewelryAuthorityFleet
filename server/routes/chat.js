import { Router } from 'express';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getDb } from '../db/db.js';

const router = Router();
const execAsync = promisify(execFile);

// ── CLI availability check ────────────────────────────────────────────────────

async function isCliAvailable() {
  try {
    await execAsync('claude', ['--version'], { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

// ── Data snapshot for context injection ──────────────────────────────────────

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

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(messages, snapshot) {
  const system = `You are the Jewelry Authority AI Analyst, embedded in a commerce intelligence dashboard for a jewelry retailer. Answer questions about the business using the live data snapshot below.

Rules:
- Be concise (2–6 sentences) unless asked for detail.
- Always cite specific numbers from the snapshot when relevant.
- If asked something the snapshot does not cover, say so plainly.
- Format currency as "$12,345".
- Refer to platforms by name: eBay, Shopify, Business Website, Salesforce.

Current data snapshot (JSON):
${JSON.stringify(snapshot, null, 2)}

---`;

  const turns = messages
    .filter((m) => m?.role && m?.content)
    .map((m) => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  return `${system}\n\n${turns}\n\nAssistant:`;
}

// ── Claude Code CLI runner ────────────────────────────────────────────────────

function runClaudeCLI(prompt) {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['--print'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Claude CLI timed out after 60 seconds'));
    }, 60_000);

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (c) => { stdout += c.toString(); });
    proc.stderr.on('data', (c) => { stderr += c.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`claude CLI exited ${code}`));
      } else {
        resolve(stdout.trim());
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      // ENOENT means the binary isn't on PATH
      if (err.code === 'ENOENT') {
        reject(new Error('claude CLI not found on PATH. Install Claude Code: https://claude.ai/code'));
      } else {
        reject(err);
      }
    });

    proc.stdin.write(prompt, 'utf8');
    proc.stdin.end();
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.get('/status', async (_req, res) => {
  const available = await isCliAvailable();
  res.json({ configured: available, engine: 'claude-code-cli' });
});

router.post('/', async (req, res) => {
  const { messages, sessionId } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages[] is required' });
  }

  const snapshot = buildDataSnapshot();
  const prompt   = buildPrompt(messages, snapshot);
  const db       = getDb();

  try {
    // Persist user turn (inside try so no orphan on CLI failure)
    if (sessionId) {
      const last = messages[messages.length - 1];
      if (last?.role === 'user') {
        db.prepare(`INSERT INTO chat_messages (role, content, session_id) VALUES (?, ?, ?)`)
          .run('user', last.content, sessionId);
      }
    }

    const text = await runClaudeCLI(prompt);

    if (sessionId) {
      db.prepare(`INSERT INTO chat_messages (role, content, session_id) VALUES (?, ?, ?)`)
        .run('assistant', text, sessionId);
    }

    res.json({ message: { role: 'assistant', content: text }, engine: 'claude-code-cli' });
  } catch (err) {
    console.error('[chat] claude CLI error:', err?.message);
    res.status(502).json({
      error: err?.message?.includes('not found')
        ? 'Claude Code CLI not found. Install it at https://claude.ai/code'
        : 'Claude Code CLI unavailable. Make sure you are authenticated (`claude` in a terminal).',
      code: 'CLI_UNAVAILABLE',
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

export default router;
