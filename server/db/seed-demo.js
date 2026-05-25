import { getDb } from './db.js';

// ---------- deterministic PRNG so demo data is stable across reseeds ----------
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
const rand = rng(424242);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const money = (lo, hi) => Math.round((lo + rand() * (hi - lo)) * 100) / 100;

// ---------- vocabulary ----------
const PLATFORMS    = ['ebay', 'shopify', 'website', 'salesforce'];
const SALES_PLATS  = ['ebay', 'shopify', 'website'];               // platforms that sell
const CATEGORIES   = ['Ring', 'Necklace', 'Earring', 'Bracelet', 'Watch', 'Pendant'];
const MATERIALS    = ['14K Gold', '18K Gold', 'Sterling Silver', 'Platinum', 'Rose Gold', 'White Gold', 'Titanium'];
const GEMSTONES    = ['Diamond', 'Sapphire', 'Ruby', 'Emerald', 'Pearl', 'Opal', 'Topaz', 'Amethyst', 'Citrine', 'Onyx'];
const STYLES       = ['Solitaire', 'Vintage', 'Modern', 'Classic', 'Bohemian', 'Art Deco', 'Minimalist', 'Statement'];
const ORDER_STATUS = ['delivered', 'delivered', 'delivered', 'delivered', 'shipped', 'shipped', 'processing', 'pending', 'cancelled', 'refunded'];

const FIRST_NAMES = ['Emma','Olivia','Ava','Sophia','Isabella','Mia','Charlotte','Amelia','Harper','Evelyn','Liam','Noah','Oliver','Elijah','William','James','Benjamin','Lucas','Henry','Alexander','Grace','Chloe','Zoey','Lily','Hannah','Sarah','Madison','Audrey','Brooklyn','Bella','Ethan','Mason','Logan','Daniel','Jackson','Sebastian','Aiden','Matthew','Samuel','David','Joseph','Carter','Owen','Wyatt','John','Jack','Luke','Jayden','Dylan','Gabriel'];
const LAST_NAMES  = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts'];
const CITIES = [
  ['New York','NY'],['Los Angeles','CA'],['Chicago','IL'],['Houston','TX'],['Phoenix','AZ'],
  ['Philadelphia','PA'],['San Antonio','TX'],['San Diego','CA'],['Dallas','TX'],['Austin','TX'],
  ['Seattle','WA'],['Denver','CO'],['Boston','MA'],['Nashville','TN'],['Portland','OR'],
];
const SF_STAGES = ['Prospecting','Qualification','Needs Analysis','Proposal','Negotiation','Closed Won','Closed Lost'];

// ---------- title generators ----------
function generateProductTitle(category) {
  const material = pick(MATERIALS);
  const style    = pick(STYLES);
  const gemstone = rand() < 0.65 ? pick(GEMSTONES) : null;
  return gemstone
    ? `${material} ${gemstone} ${style} ${category}`
    : `${material} ${style} ${category}`;
}

function generateDescription(title, category) {
  return `Handcrafted ${title.toLowerCase()}. A timeless ${category.toLowerCase()} suited for everyday wear or special occasions. Comes with a certificate of authenticity and lifetime warranty.`;
}

function generateSKU(category, idx) {
  return `${category.slice(0,3).toUpperCase()}-${String(idx).padStart(4,'0')}`;
}

// ---------- main seed ----------
export function seedDemo() {
  const db = getDb();

  const txn = db.transaction(() => {
    // hard reset of all demo-able rows — inside transaction for atomicity
    db.exec(`
      DELETE FROM sync_logs;
      DELETE FROM sf_opportunities;
      DELETE FROM orders;
      DELETE FROM customers;
      DELETE FROM products;
    `);
    // ---- platforms: mark all as 'demo' ----
    const setPlat = db.prepare(`UPDATE platforms SET status = 'demo', last_sync = CURRENT_TIMESTAMP WHERE id = ?`);
    for (const p of PLATFORMS) setPlat.run(p);

    // ---- products (50) ----
    const insertProduct = db.prepare(`
      INSERT INTO products
        (platform_id, external_id, title, description, category, price, cost,
         inventory_qty, sku, images, tags, status, material, weight_grams)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const productIds = [];
    for (let i = 1; i <= 50; i++) {
      const category = pick(CATEGORIES);
      const title    = generateProductTitle(category);
      const platform = pick(SALES_PLATS);
      const price    = money(15, 4500);
      const cost     = Math.round(price * (0.3 + rand() * 0.25) * 100) / 100;
      const inv      = rand() < 0.15 ? between(0, 2) : between(3, 40);
      const material = pick(MATERIALS);
      const tags     = [category, material, ...(rand() < 0.5 ? [pick(GEMSTONES)] : [])];
      const status   = inv === 0 ? 'sold' : (rand() < 0.05 ? 'draft' : 'active');

      const info = insertProduct.run(
        platform,
        `${platform.toUpperCase()}-PROD-${10000 + i}`,
        title,
        generateDescription(title, category),
        category,
        price,
        cost,
        inv,
        generateSKU(category, i),
        JSON.stringify([`https://picsum.photos/seed/jewelry-${i}/400/400`]),
        JSON.stringify(tags),
        status,
        material,
        Math.round((1 + rand() * 30) * 10) / 10,
      );
      productIds.push({ id: info.lastInsertRowid, title, price, platform });
    }

    // ---- customers (100) ----
    const insertCustomer = db.prepare(`
      INSERT INTO customers
        (platform_id, external_id, first_name, last_name, email, phone, address,
         total_orders, lifetime_value, first_order_at, last_order_at, tags,
         salesforce_contact_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const customerIds = [];
    for (let i = 1; i <= 100; i++) {
      const first = pick(FIRST_NAMES);
      const last  = pick(LAST_NAMES);
      const platform = pick(SALES_PLATS);
      const [city, state] = pick(CITIES);
      const address = {
        line1: `${between(100, 9999)} ${pick(['Main','Oak','Maple','Pine','Cedar','Elm'])} ${pick(['St','Ave','Blvd','Rd'])}`,
        city, state,
        zip: String(between(10000, 99999)),
        country: 'US',
      };
      const sfId = rand() < 0.4 ? `003${String(between(100000000, 999999999))}` : null;
      const info = insertCustomer.run(
        platform,
        `${platform.toUpperCase()}-CUST-${20000 + i}`,
        first, last,
        `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
        `+1-${between(200, 999)}-${between(200,999)}-${between(1000,9999)}`,
        JSON.stringify(address),
        0,  // will be backfilled
        0,  // will be backfilled
        null, null,
        JSON.stringify(rand() < 0.3 ? ['vip'] : []),
        sfId,
      );
      customerIds.push({ id: info.lastInsertRowid, platform, sfId, address });
    }

    // ---- orders (200, spread across last 12 months) ----
    const insertOrder = db.prepare(`
      INSERT INTO orders
        (platform_id, external_id, customer_id, status, total_amount, subtotal,
         shipping_cost, tax, discount, currency, items, shipping_address,
         ordered_at, shipped_at, delivered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?)
    `);

    const now = Date.now();
    const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const customerStats = new Map(); // id -> { count, value, first, last }

    for (let i = 1; i <= 200; i++) {
      const customer = pick(customerIds);
      const platform = customer.platform;
      const status   = pick(ORDER_STATUS);

      const lineCount = between(1, 3);
      const items = [];
      let subtotal = 0;
      for (let k = 0; k < lineCount; k++) {
        const prod = pick(productIds);
        const qty  = between(1, 2);
        items.push({ product_id: prod.id, title: prod.title, qty, price: prod.price });
        subtotal += prod.price * qty;
      }
      subtotal = Math.round(subtotal * 100) / 100;
      const shipping = status === 'cancelled' ? 0 : Math.round((5 + rand() * 20) * 100) / 100;
      const tax      = Math.round(subtotal * 0.08 * 100) / 100;
      const discount = rand() < 0.2 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
      const total    = Math.round((subtotal + shipping + tax - discount) * 100) / 100;

      const ordered = new Date(now - rand() * YEAR_MS);
      const shipped = ['shipped','delivered'].includes(status)
        ? new Date(ordered.getTime() + between(1,3) * 24 * 60 * 60 * 1000)
        : null;
      const delivered = status === 'delivered'
        ? new Date(ordered.getTime() + between(4,9) * 24 * 60 * 60 * 1000)
        : null;

      insertOrder.run(
        platform,
        `${platform.toUpperCase()}-ORD-${30000 + i}`,
        customer.id,
        status,
        total, subtotal, shipping, tax, discount,
        JSON.stringify(items),
        JSON.stringify(customer.address),
        ordered.toISOString(),
        shipped ? shipped.toISOString() : null,
        delivered ? delivered.toISOString() : null,
      );

      if (!['cancelled','refunded'].includes(status)) {
        const s = customerStats.get(customer.id) || { count: 0, value: 0, first: ordered, last: ordered };
        s.count += 1;
        s.value += total;
        if (ordered < s.first) s.first = ordered;
        if (ordered > s.last)  s.last  = ordered;
        customerStats.set(customer.id, s);
      }
    }

    // backfill customer LTV/order count
    const updateCustomer = db.prepare(`
      UPDATE customers SET total_orders = ?, lifetime_value = ?, first_order_at = ?, last_order_at = ?
      WHERE id = ?
    `);
    for (const [cid, s] of customerStats) {
      updateCustomer.run(
        s.count,
        Math.round(s.value * 100) / 100,
        s.first.toISOString(),
        s.last.toISOString(),
        cid,
      );
    }

    // ---- salesforce opportunities (20) ----
    const insertOpp = db.prepare(`
      INSERT INTO sf_opportunities
        (external_id, name, customer_id, stage, amount, close_date, probability, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (let i = 1; i <= 20; i++) {
      const customer = pick(customerIds);
      const stage    = pick(SF_STAGES);
      const probMap  = {
        'Prospecting': 10, 'Qualification': 25, 'Needs Analysis': 40,
        'Proposal': 60, 'Negotiation': 80, 'Closed Won': 100, 'Closed Lost': 0,
      };
      const closeDate = new Date(now + (between(-30, 90)) * 24 * 60 * 60 * 1000);
      insertOpp.run(
        `006${String(between(100000000, 999999999))}`,
        `${pick(['Custom Engagement Ring','Anniversary Set','Bridal Collection','Estate Piece','Bespoke Necklace','Heirloom Restoration'])} - ${pick(LAST_NAMES)}`,
        customer.id,
        stage,
        money(2500, 25000),
        closeDate.toISOString().slice(0,10),
        probMap[stage] ?? 50,
        'High-value bespoke jewelry opportunity sourced from in-store consultation.',
      );
    }

    // ---- sync logs ----
    const insertLog = db.prepare(`
      INSERT INTO sync_logs (platform_id, status, records_synced, started_at, completed_at)
      VALUES (?, 'success', ?, ?, ?)
    `);
    for (const p of PLATFORMS) {
      for (let k = 0; k < 5; k++) {
        const t = new Date(now - k * 6 * 60 * 60 * 1000);
        insertLog.run(p, between(20, 200), t.toISOString(), new Date(t.getTime() + 4000).toISOString());
      }
    }

    // ---- mark demo on ----
    db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('demo_mode', 'true', CURRENT_TIMESTAMP)`).run();
  });

  txn();
  return { products: 50, orders: 200, customers: 100, opportunities: 20 };
}

export function clearDemo() {
  const db = getDb();
  const txn = db.transaction(() => {
    db.exec(`
      DELETE FROM sync_logs;
      DELETE FROM sf_opportunities;
      DELETE FROM orders;
      DELETE FROM customers;
      DELETE FROM products;
      DELETE FROM chat_messages;
    `);
    db.prepare(`UPDATE platforms SET status = 'disconnected', last_sync = NULL`).run();
    db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('demo_mode', 'false', CURRENT_TIMESTAMP)`).run();
  });
  txn();
}

export function isDemoMode() {
  const row = getDb().prepare(`SELECT value FROM settings WHERE key = 'demo_mode'`).get();
  return row?.value === 'true';
}
