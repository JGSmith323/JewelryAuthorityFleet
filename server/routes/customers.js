import { Router } from 'express';
import { getDb } from '../db/db.js';
import { hydrate } from './_util.js';

const router = Router();
const JSON_COLS = ['address', 'tags'];

router.get('/', (req, res) => {
  const { platform, search, limit = 200 } = req.query;
  const where = [];
  const params = {};
  if (platform) { where.push('platform_id = @platform'); params.platform = platform; }
  if (search) {
    where.push('(first_name LIKE @search OR last_name LIKE @search OR email LIKE @search)');
    params.search = `%${search}%`;
  }
  const sql = `
    SELECT * FROM customers
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY lifetime_value DESC
    LIMIT ${Number(limit) || 200}
  `;
  const rows = getDb().prepare(sql).all(params).map((r) => hydrate(r, JSON_COLS));
  res.json({ customers: rows, count: rows.length });
});

router.get('/:id', (req, res) => {
  const row = getDb().prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Customer not found' });
  const orders = getDb().prepare(`
    SELECT id, platform_id, external_id, status, total_amount, ordered_at
    FROM orders WHERE customer_id = ? ORDER BY ordered_at DESC LIMIT 50
  `).all(req.params.id);
  res.json({ customer: hydrate(row, JSON_COLS), orders });
});

export default router;
