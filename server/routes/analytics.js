import { Router } from 'express';
import { getDb } from '../db/db.js';

const router = Router();

// ---------- helpers ----------
function isoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// ---------- /revenue ----------
router.get('/revenue', (_req, res) => {
  const db = getDb();

  // by platform, last 12 months
  const byPlatformMonth = db.prepare(`
    SELECT
      platform_id,
      strftime('%Y-%m', ordered_at) AS month,
      ROUND(SUM(total_amount), 2) AS revenue
    FROM orders
    WHERE ordered_at >= @cutoff AND status NOT IN ('cancelled','refunded')
    GROUP BY platform_id, month
    ORDER BY month ASC
  `).all({ cutoff: isoDaysAgo(365) });

  const byCategory = db.prepare(`
    SELECT p.category AS category,
           ROUND(SUM(json_extract(j.value, '$.price') * json_extract(j.value, '$.qty')), 2) AS revenue
    FROM orders o, json_each(o.items) j
    JOIN products p ON p.id = json_extract(j.value, '$.product_id')
    WHERE o.status NOT IN ('cancelled','refunded')
    GROUP BY p.category
    ORDER BY revenue DESC
  `).all();

  const byPlatformTotal = db.prepare(`
    SELECT platform_id, ROUND(SUM(total_amount), 2) AS revenue, COUNT(*) AS orders
    FROM orders
    WHERE status NOT IN ('cancelled','refunded')
    GROUP BY platform_id
  `).all();

  // 30d window + prior 30d for trend
  const last30 = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS orders
    FROM orders
    WHERE ordered_at >= @cutoff AND status NOT IN ('cancelled','refunded')
  `).get({ cutoff: isoDaysAgo(30) });

  const prev30 = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS orders
    FROM orders
    WHERE ordered_at >= @from AND ordered_at < @to AND status NOT IN ('cancelled','refunded')
  `).get({ from: isoDaysAgo(60), to: isoDaysAgo(30) });

  res.json({ byPlatformMonth, byCategory, byPlatformTotal, last30, prev30 });
});

// ---------- /orders ----------
router.get('/orders', (_req, res) => {
  const db = getDb();
  const byStatus = db.prepare(`
    SELECT status, COUNT(*) AS count FROM orders GROUP BY status
  `).all();
  const byPlatform = db.prepare(`
    SELECT platform_id, COUNT(*) AS count FROM orders GROUP BY platform_id
  `).all();
  const byDay = db.prepare(`
    SELECT strftime('%Y-%m-%d', ordered_at) AS day, COUNT(*) AS count
    FROM orders
    WHERE ordered_at >= @cutoff
    GROUP BY day ORDER BY day ASC
  `).all({ cutoff: isoDaysAgo(30) });
  res.json({ byStatus, byPlatform, byDay });
});

// ---------- /products ----------
router.get('/products', (_req, res) => {
  const db = getDb();
  const topByRevenue = db.prepare(`
    SELECT
      p.id, p.title, p.platform_id, p.category, p.price,
      ROUND(SUM(json_extract(j.value, '$.price') * json_extract(j.value, '$.qty')), 2) AS revenue,
      SUM(json_extract(j.value, '$.qty')) AS units
    FROM orders o, json_each(o.items) j
    JOIN products p ON p.id = json_extract(j.value, '$.product_id')
    WHERE o.status NOT IN ('cancelled','refunded')
    GROUP BY p.id
    ORDER BY revenue DESC
    LIMIT 10
  `).all();

  const lowStock = db.prepare(`
    SELECT id, title, platform_id, inventory_qty, sku
    FROM products
    WHERE status = 'active' AND inventory_qty <= 3
    ORDER BY inventory_qty ASC
    LIMIT 20
  `).all();

  const counts = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = 'draft'  THEN 1 ELSE 0 END) AS drafts,
      SUM(CASE WHEN inventory_qty <= 3 AND status = 'active' THEN 1 ELSE 0 END) AS low_stock
    FROM products
  `).get();

  res.json({ topByRevenue, lowStock, counts });
});

// ---------- /customers ----------
router.get('/customers', (_req, res) => {
  const db = getDb();
  const newPerMonth = db.prepare(`
    SELECT strftime('%Y-%m', first_order_at) AS month, COUNT(*) AS count
    FROM customers
    WHERE first_order_at IS NOT NULL AND first_order_at >= @cutoff
    GROUP BY month ORDER BY month ASC
  `).all({ cutoff: isoDaysAgo(365) });

  const topByLtv = db.prepare(`
    SELECT id, first_name, last_name, email, platform_id, total_orders, ROUND(lifetime_value, 2) AS lifetime_value
    FROM customers
    WHERE lifetime_value > 0
    ORDER BY lifetime_value DESC
    LIMIT 10
  `).all();

  const newLast30 = db.prepare(`
    SELECT COUNT(*) AS count FROM customers WHERE first_order_at >= @cutoff
  `).get({ cutoff: isoDaysAgo(30) });
  const newPrev30 = db.prepare(`
    SELECT COUNT(*) AS count FROM customers
    WHERE first_order_at >= @from AND first_order_at < @to
  `).get({ from: isoDaysAgo(60), to: isoDaysAgo(30) });

  res.json({ newPerMonth, topByLtv, newLast30: newLast30.count, newPrev30: newPrev30.count });
});

export default router;
