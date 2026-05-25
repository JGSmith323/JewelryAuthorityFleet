import { Router } from 'express';
import { getDb } from '../db/db.js';
import { hydrate } from './_util.js';

const router = Router();
const JSON_COLS = ['images', 'tags'];

router.get('/', (req, res) => {
  const { platform, category, status, search, limit = 200 } = req.query;
  const where = [];
  const params = {};
  if (platform) { where.push('platform_id = @platform'); params.platform = platform; }
  if (category) { where.push('category    = @category'); params.category = category; }
  if (status)   { where.push('status      = @status');   params.status   = status; }
  if (search)   {
    where.push('(title LIKE @search OR sku LIKE @search OR description LIKE @search)');
    params.search = `%${search}%`;
  }
  const sql = `
    SELECT * FROM products
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY updated_at DESC
    LIMIT ${Number(limit) || 200}
  `;
  const rows = getDb().prepare(sql).all(params).map((r) => hydrate(r, JSON_COLS));
  res.json({ products: rows, count: rows.length });
});

router.get('/:id', (req, res) => {
  const row = getDb().prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Product not found' });
  res.json({ product: hydrate(row, JSON_COLS) });
});

router.post('/', (req, res) => {
  const b = req.body || {};
  const info = getDb().prepare(`
    INSERT INTO products
      (platform_id, external_id, title, description, category, price, cost,
       inventory_qty, sku, images, tags, status, material, weight_grams)
    VALUES (@platform_id, @external_id, @title, @description, @category, @price, @cost,
            @inventory_qty, @sku, @images, @tags, @status, @material, @weight_grams)
  `).run({
    platform_id: b.platform_id || 'website',
    external_id: b.external_id || null,
    title: b.title || 'Untitled',
    description: b.description || null,
    category: b.category || null,
    price: b.price ?? 0,
    cost: b.cost ?? 0,
    inventory_qty: b.inventory_qty ?? 0,
    sku: b.sku || null,
    images: JSON.stringify(b.images || []),
    tags: JSON.stringify(b.tags || []),
    status: b.status || 'active',
    material: b.material || null,
    weight_grams: b.weight_grams ?? null,
  });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const b = req.body || {};
  const existing = getDb().prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  const merged = { ...existing, ...b };
  getDb().prepare(`
    UPDATE products SET
      title = @title, description = @description, category = @category,
      price = @price, cost = @cost, inventory_qty = @inventory_qty,
      sku = @sku, status = @status, material = @material, weight_grams = @weight_grams,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `).run({
    id: req.params.id,
    title: merged.title, description: merged.description, category: merged.category,
    price: merged.price, cost: merged.cost, inventory_qty: merged.inventory_qty,
    sku: merged.sku, status: merged.status, material: merged.material,
    weight_grams: merged.weight_grams,
  });
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
