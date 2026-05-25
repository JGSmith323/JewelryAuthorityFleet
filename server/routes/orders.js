import { Router } from 'express';
import { getDb } from '../db/db.js';
import { hydrate } from './_util.js';

const router = Router();
const JSON_COLS = ['items', 'shipping_address'];

router.get('/', (req, res) => {
  const { platform, status, from, to, limit = 200 } = req.query;
  const where = [];
  const params = {};
  if (platform) { where.push('o.platform_id = @platform'); params.platform = platform; }
  if (status)   { where.push('o.status      = @status');   params.status   = status; }
  if (from)     { where.push('o.ordered_at >= @from');     params.from     = from; }
  if (to)       { where.push('o.ordered_at <= @to');       params.to       = to; }

  const sql = `
    SELECT
      o.*,
      (c.first_name || ' ' || c.last_name) AS customer_name,
      c.email AS customer_email
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY o.ordered_at DESC
    LIMIT ${Math.max(1, Math.min(Number(limit) || 200, 1000))}
  `;
  const rows = getDb().prepare(sql).all(params).map((r) => hydrate(r, JSON_COLS));

  // top-card aggregates over the same filter set
  const aggSql = `
    SELECT
      COUNT(*) AS count,
      COALESCE(SUM(total_amount), 0) AS total_value,
      COALESCE(AVG(total_amount), 0) AS avg_value,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_count
    FROM orders o
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
  `;
  const stats = getDb().prepare(aggSql).get(params);

  res.json({ orders: rows, stats });
});

router.get('/:id', (req, res) => {
  const row = getDb().prepare(`
    SELECT o.*, (c.first_name || ' ' || c.last_name) AS customer_name, c.email AS customer_email
    FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Order not found' });
  res.json({ order: hydrate(row, JSON_COLS) });
});

export default router;
