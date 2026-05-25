import { getDb } from './db.js';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS platforms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected',
  last_sync DATETIME,
  config TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_id TEXT NOT NULL,
  external_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price REAL,
  cost REAL,
  inventory_qty INTEGER DEFAULT 0,
  sku TEXT,
  images TEXT,
  tags TEXT,
  status TEXT DEFAULT 'active',
  material TEXT,
  weight_grams REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_id TEXT NOT NULL,
  external_id TEXT,
  customer_id INTEGER,
  status TEXT DEFAULT 'pending',
  total_amount REAL,
  subtotal REAL,
  shipping_cost REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  items TEXT,
  shipping_address TEXT,
  notes TEXT,
  ordered_at DATETIME,
  shipped_at DATETIME,
  delivered_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_id TEXT NOT NULL,
  external_id TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  total_orders INTEGER DEFAULT 0,
  lifetime_value REAL DEFAULT 0,
  first_order_at DATETIME,
  last_order_at DATETIME,
  tags TEXT,
  salesforce_contact_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sf_opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT,
  name TEXT,
  customer_id INTEGER,
  stage TEXT,
  amount REAL,
  close_date DATE,
  probability INTEGER,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  session_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_id TEXT,
  status TEXT,
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_platform   ON orders(platform_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_ordered_at ON orders(ordered_at);
CREATE INDEX IF NOT EXISTS idx_products_platform ON products(platform_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_customers_platform ON customers(platform_id);
CREATE INDEX IF NOT EXISTS idx_chat_session       ON chat_messages(session_id, created_at);
`;

const DEFAULT_PLATFORMS = [
  { id: 'ebay',       name: 'eBay' },
  { id: 'shopify',    name: 'Shopify' },
  { id: 'website',    name: 'Business Website' },
  { id: 'salesforce', name: 'Salesforce' },
];

export function initSchema() {
  const db = getDb();
  db.exec(SCHEMA_SQL);

  const insert = db.prepare(
    `INSERT OR IGNORE INTO platforms (id, name, status) VALUES (?, ?, 'disconnected')`
  );
  for (const p of DEFAULT_PLATFORMS) insert.run(p.id, p.name);

  const insertSetting = db.prepare(
    `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`
  );
  insertSetting.run('demo_mode', 'false');
  return db;
}

// Allow `node db/schema.js` standalone init
if (import.meta.url === `file://${process.argv[1]}`) {
  initSchema();
  console.log('[schema] initialized');
  process.exit(0);
}
