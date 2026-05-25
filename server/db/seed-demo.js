import { getDb } from './db.js';

// ---------- deterministic PRNG so demo data is stable across reseeds ----------
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
const rand     = rng(424242);
const randHero = rng(999999); // separate PRNG for hero product extra orders — unused directly but reserved
const pick     = (arr)    => arr[Math.floor(rand() * arr.length)];
const between  = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const money    = (lo, hi) => Math.round((lo + rand() * (hi - lo)) * 100) / 100;

// ---------- vocabulary ----------
const PLATFORMS   = ['ebay', 'shopify', 'website', 'salesforce'];
const CATEGORIES  = ['Ring', 'Necklace', 'Earring', 'Bracelet', 'Watch', 'Pendant'];
const MATERIALS   = ['14K Gold', '18K Gold', 'Sterling Silver', 'Platinum', 'Rose Gold', 'White Gold', 'Titanium'];
const GEMSTONES   = ['Diamond', 'Sapphire', 'Ruby', 'Emerald', 'Pearl', 'Opal', 'Topaz', 'Amethyst', 'Citrine', 'Onyx'];
const ORDER_STATUS = ['delivered', 'delivered', 'delivered', 'delivered', 'shipped', 'shipped', 'processing', 'pending', 'cancelled', 'refunded'];

const PRODUCT_NAMES = {
  Ring: [
    'Solitaire Engagement Ring', 'Eternity Band', 'Halo Ring', 'Cluster Ring',
    'Three-Stone Ring', 'Signet Ring', 'Promise Ring', 'Cocktail Ring',
    'Cathedral Setting Ring', 'Bypass Ring', 'Tension Set Ring', 'Bezel Set Ring',
  ],
  Necklace: [
    'Pendant Necklace', 'Chain Necklace', 'Lariat Necklace', 'Collar Necklace',
    'Statement Necklace', 'Choker', 'Y-Necklace', 'Bar Necklace',
    'Heart Necklace', 'Cross Necklace', 'Tennis Necklace', 'Opera Necklace',
  ],
  Earring: [
    'Stud Earrings', 'Hoop Earrings', 'Drop Earrings', 'Huggie Earrings',
    'Chandelier Earrings', 'Ear Climbers', 'Crawler Earrings', 'Dangle Earrings',
    'Threader Earrings', 'Jacket Earrings', 'Geometric Earrings', 'Cluster Earrings',
  ],
  Bracelet: [
    'Tennis Bracelet', 'Bangle Bracelet', 'Chain Bracelet', 'Cuff Bracelet',
    'Charm Bracelet', 'Link Bracelet', 'Wrap Bracelet', 'Beaded Bracelet',
    'Infinity Bracelet', 'Adjustable Bracelet', 'Station Bracelet', 'Stretch Bracelet',
  ],
  Watch: [
    'Diamond Dial Watch', 'Dress Watch', 'Chronograph Watch', 'Pavé Watch',
    'Bracelet Watch', 'Minimalist Watch', 'Statement Watch', 'Anniversary Watch',
  ],
  Pendant: [
    'Teardrop Pendant', 'Oval Pendant', 'Marquise Pendant', 'Cushion Pendant',
    'Pear Pendant', 'Round Pendant', 'Emerald Cut Pendant', 'Princess Cut Pendant',
    'Floral Pendant', 'Geometric Pendant', 'Vintage Locket', 'Initial Pendant',
  ],
};

// Price ranges by (category, platform tier).
// website = high end, shopify = mid, ebay = low end (real AOV: ~$800/$450/$180)
const PRICE_RANGES = {
  website: {
    Ring:     [600,  6000],
    Necklace: [400,  3500],
    Earring:  [250,  1800],
    Bracelet: [350,  2200],
    Watch:    [1200, 8500],
    Pendant:  [300,  2800],
  },
  shopify: {
    Ring:     [100,  1200],
    Necklace: [60,    700],
    Earring:  [40,    500],
    Bracelet: [60,    600],
    Watch:    [180,   900],
    Pendant:  [55,    550],
  },
  ebay: {
    Ring:     [40,   350],
    Necklace: [25,   250],
    Earring:  [15,   180],
    Bracelet: [20,   220],
    Watch:    [80,   600],
    Pendant:  [20,   200],
  },
};

// Hero products — hard-coded top sellers, get ~3x as many orders
const HERO_PRODUCTS = [
  { title: '18K Gold Diamond Solitaire Engagement Ring',  category: 'Ring',     platform: 'website', price: 4850,  cost: 1800 },
  { title: 'Platinum Diamond Tennis Bracelet',            category: 'Bracelet', platform: 'shopify', price: 3200,  cost: 1100 },
  { title: '14K White Gold Diamond Halo Earrings',        category: 'Earring',  platform: 'website', price: 1650,  cost:  580 },
  { title: 'Sterling Silver Diamond Tennis Necklace',     category: 'Necklace', platform: 'shopify', price: 1200,  cost:  390 },
  { title: '18K Rose Gold Sapphire Pendant Necklace',     category: 'Necklace', platform: 'website', price: 2100,  cost:  720 },
  { title: 'White Gold Emerald Three-Stone Ring',         category: 'Ring',     platform: 'shopify', price: 2800,  cost:  950 },
];

// Seasonal order weight per month (0-indexed Jan=0)
const MONTH_WEIGHTS = [
  0.6,  // Jan — post-holiday slump
  1.8,  // Feb — Valentine's
  0.7,  // Mar
  0.7,  // Apr
  1.5,  // May — Mother's Day
  0.8,  // Jun
  0.7,  // Jul
  0.8,  // Aug
  0.9,  // Sep
  1.3,  // Oct — engagement season
  0.8,  // Nov
  2.0,  // Dec — holiday peak
];

const FIRST_NAMES = ['Emma','Olivia','Ava','Sophia','Isabella','Mia','Charlotte','Amelia','Harper','Evelyn','Liam','Noah','Oliver','Elijah','William','James','Benjamin','Lucas','Henry','Alexander','Grace','Chloe','Zoey','Lily','Hannah','Sarah','Madison','Audrey','Brooklyn','Bella','Ethan','Mason','Logan','Daniel','Jackson','Sebastian','Aiden','Matthew','Samuel','David','Joseph','Carter','Owen','Wyatt','John','Jack','Luke','Jayden','Dylan','Gabriel'];
const LAST_NAMES  = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts'];
const CITIES = [
  ['New York','NY'],['Los Angeles','CA'],['Chicago','IL'],['Houston','TX'],['Phoenix','AZ'],
  ['Philadelphia','PA'],['San Antonio','TX'],['San Diego','CA'],['Dallas','TX'],['Austin','TX'],
  ['Seattle','WA'],['Denver','CO'],['Boston','MA'],['Nashville','TN'],['Portland','OR'],
];

const SF_STAGES       = ['Prospecting','Qualification','Needs Analysis','Proposal','Negotiation','Closed Won','Closed Lost'];
// Distribution weights: heavy on mid-to-late funnel
const SF_STAGE_WEIGHTS = [3, 4, 5, 10, 10, 12, 6]; // sum = 50

const OPP_NAMES = [
  'Custom Engagement Ring Commission', 'Bridal Party Jewelry Set', 'Corporate Gift Program',
  'Estate Jewelry Restoration', 'Anniversary Collection', 'Wholesale Account Setup',
  'Private Client Bespoke Necklace', 'Museum Replica Commission', 'Celebrity Styling Contract',
  'Hotel Gift Shop Partnership', 'Charity Gala Donation Piece', 'Gallery Exhibition Set',
  'Inheritance Redesign Project', 'Retirement Gift Collection', 'Baby Shower Jewelry Set',
];

const OPP_DESCRIPTIONS = [
  'High-value bespoke jewelry opportunity sourced from in-store consultation.',
  'Private client seeking a custom heirloom piece; referred by existing VIP customer.',
  'Wholesale account with a regional boutique chain; multi-SKU catalog order.',
  'Corporate gifting program for executive team; annual renewal expected.',
  'Estate restoration: client inherited vintage pieces needing redesign and appraisal.',
  'Celebrity stylist requesting exclusive bridal set for upcoming film production.',
  'Hotel concierge partnership for curated gift bags; quarterly fulfillment.',
  'Charity gala donation centerpiece — high visibility PR opportunity.',
  'Gallery exhibition commission — limited edition wearable art collection.',
  'Out-of-state client relocating; looking for signature piece to mark the occasion.',
];

const ERROR_MESSAGES = [
  'API rate limit exceeded — retry after 60 seconds',
  'OAuth token expired — re-authentication required',
  'Connection timeout after 30 000 ms',
  'Unexpected response format from upstream API',
  'Webhook delivery failed: 503 Service Unavailable',
];

// ---------- helpers ----------
function generateDescription(title, category) {
  return `Handcrafted ${title.toLowerCase()}. A timeless ${category.toLowerCase()} suited for everyday wear or special occasions. Comes with a certificate of authenticity and lifetime warranty.`;
}

function generateSKU(category, idx) {
  return `${category.slice(0, 3).toUpperCase()}-${String(idx).padStart(4, '0')}`;
}

// Build weighted (year, month) buckets spanning 24 calendar months ending today.
function buildMonthBuckets(now) {
  const today   = new Date(now);
  const buckets = [];

  for (let offset = 23; offset >= 0; offset--) {
    const d       = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 1));
    const monthIdx = d.getUTCMonth();
    const startMs  = d.getTime();
    const endMs    = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59)).getTime();
    // 20% YoY growth: months in year 1 (offset 23–12) get 1.0x, year 2 (offset 11–0) get 1.2x
    const yearMult = offset >= 12 ? 1.0 : 1.2;
    const weight   = MONTH_WEIGHTS[monthIdx] * yearMult;
    buckets.push({ startMs, endMs, weight });
  }

  let cum = 0;
  const cumWeights = buckets.map(b => { cum += b.weight; return cum; });
  return { buckets, cumWeights, totalWeight: cum };
}

function pickBucket(buckets, cumWeights, totalWeight) {
  const r = rand() * totalWeight;
  for (let i = 0; i < cumWeights.length; i++) {
    if (r <= cumWeights[i]) return buckets[i];
  }
  return buckets[buckets.length - 1];
}

function randInBucket(bucket) {
  return new Date(bucket.startMs + rand() * (bucket.endMs - bucket.startMs));
}

function weightedStageIndex() {
  const total = SF_STAGE_WEIGHTS.reduce((a, b) => a + b, 0);
  const r     = rand() * total;
  let cum     = 0;
  for (let i = 0; i < SF_STAGE_WEIGHTS.length; i++) {
    cum += SF_STAGE_WEIGHTS[i];
    if (r <= cum) return i;
  }
  return SF_STAGE_WEIGHTS.length - 1;
}

// ---------- main seed ----------
export function seedDemo() {
  const db = getDb();

  const txn = db.transaction(() => {

    // Hard reset of all demo rows
    db.exec(`
      DELETE FROM sync_logs;
      DELETE FROM sf_opportunities;
      DELETE FROM orders;
      DELETE FROM customers;
      DELETE FROM products;
      DELETE FROM chat_messages;
    `);

    const setPlat = db.prepare(`UPDATE platforms SET status = 'demo', last_sync = CURRENT_TIMESTAMP WHERE id = ?`);
    for (const p of PLATFORMS) setPlat.run(p);

    // ================================================================
    // PRODUCTS  (150 total: 6 hero + 144 regular)
    // ================================================================
    const insertProduct = db.prepare(`
      INSERT INTO products
        (platform_id, external_id, title, description, category, price, cost,
         inventory_qty, sku, images, tags, status, material, weight_grams)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // productIds grouped by platform for targeted order assignment
    const allProducts  = [];  // { id, title, price, platform, isHero }

    // Insert 6 hero products (indices 1–6)
    for (let i = 0; i < HERO_PRODUCTS.length; i++) {
      const h      = HERO_PRODUCTS[i];
      const inv    = i < 2 ? between(1, 3) : between(4, 18); // first 2 are low-stock
      const mat    = pick(MATERIALS);
      const info   = insertProduct.run(
        h.platform,
        `${h.platform.toUpperCase()}-PROD-${10000 + i + 1}`,
        h.title,
        generateDescription(h.title, h.category),
        h.category,
        h.price,
        h.cost,
        inv,
        generateSKU(h.category, i + 1),
        JSON.stringify([`https://picsum.photos/seed/hero-${i + 1}/400/400`]),
        JSON.stringify([h.category, mat, 'Diamond']),
        'active',
        mat,
        Math.round((2 + rand() * 28) * 10) / 10,
      );
      allProducts.push({ id: info.lastInsertRowid, title: h.title, price: h.price, platform: h.platform, isHero: true });
    }

    // Insert 144 regular products (indices 7–150), ensuring ≥10 low-stock total
    let lowStockCount = 2; // hero already contributed 2
    for (let i = 7; i <= 150; i++) {
      const category   = pick(CATEGORIES);
      const style      = pick(PRODUCT_NAMES[category]);
      const material   = pick(MATERIALS);
      const gemstone   = rand() < 0.65 ? pick(GEMSTONES) : null;
      const title      = gemstone ? `${material} ${gemstone} ${style}` : `${material} ${style}`;
      // Assign platform so each has a roughly even catalog share
      const platRoll   = rand();
      const platform   = platRoll < 0.40 ? 'ebay' : platRoll < 0.72 ? 'shopify' : 'website';
      const [pLo, pHi] = PRICE_RANGES[platform][category];
      const price      = money(pLo, pHi);
      const cost       = Math.round(price * (0.28 + rand() * 0.22) * 100) / 100;

      // Force low-stock on enough products to hit ≥10 total
      let inv;
      const remaining  = 144 - (i - 7);
      const stillNeed  = Math.max(0, 10 - lowStockCount);
      if (stillNeed > 0 && remaining <= stillNeed) {
        inv = between(0, 3);
        lowStockCount++;
      } else if (rand() < 0.08) {
        inv = between(0, 3);
        lowStockCount++;
      } else {
        inv = between(4, 55);
      }

      const status = inv === 0 ? 'sold' : (rand() < 0.04 ? 'draft' : 'active');
      const info   = insertProduct.run(
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
        JSON.stringify([category, material, ...(gemstone ? [gemstone] : [])]),
        status,
        material,
        Math.round((1 + rand() * 30) * 10) / 10,
      );
      allProducts.push({ id: info.lastInsertRowid, title, price, platform, isHero: false });
    }

    // Partition products by platform for targeted selection
    const heroProducts    = allProducts.filter(p => p.isHero);
    const ebayProducts    = allProducts.filter(p => !p.isHero && p.platform === 'ebay');
    const shopifyProducts = allProducts.filter(p => !p.isHero && p.platform === 'shopify');
    const websiteProducts = allProducts.filter(p => !p.isHero && p.platform === 'website');

    // pickForPlatform: hero products get ~3x weight on website/shopify;
    // eBay strictly uses the low-priced eBay catalog only.
    function pickForPlatform(platform) {
      if (platform === 'ebay') {
        // eBay: always pick from eBay's low-price catalog only
        return ebayProducts[Math.floor(rand() * ebayProducts.length)];
      }
      if (platform === 'website') {
        // website: 50% chance hero, else website catalog
        const r = rand();
        if (r < 0.50) return heroProducts[Math.floor(rand() * heroProducts.length)];
        if (websiteProducts.length > 0) return websiteProducts[Math.floor(rand() * websiteProducts.length)];
        return heroProducts[Math.floor(rand() * heroProducts.length)];
      }
      // shopify: 4% chance of hero product, else shopify catalog
      const r = rand();
      if (r < 0.04) return heroProducts[Math.floor(rand() * heroProducts.length)];
      if (shopifyProducts.length > 0) return shopifyProducts[Math.floor(rand() * shopifyProducts.length)];
      return heroProducts[Math.floor(rand() * heroProducts.length)];
    }

    // ================================================================
    // CUSTOMERS  (300: 15 whale, 40 high-value, 245 regular)
    // ================================================================
    const insertCustomer = db.prepare(`
      INSERT INTO customers
        (platform_id, external_id, first_name, last_name, email, phone, address,
         total_orders, lifetime_value, first_order_at, last_order_at, tags,
         salesforce_contact_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const CUSTOMER_TIERS = [
      { tier: 'whale',   count: 15,  minOrders: 8,  maxOrders: 15 },
      { tier: 'highval', count: 40,  minOrders: 4,  maxOrders: 7  },
      { tier: 'regular', count: 245, minOrders: 1,  maxOrders: 3  },
    ];

    const customerIds = [];
    let custIdx = 1;

    for (const tierDef of CUSTOMER_TIERS) {
      for (let i = 0; i < tierDef.count; i++) {
        const first = pick(FIRST_NAMES);
        const last  = pick(LAST_NAMES);
        // Platform distribution: eBay 40%, shopify 40%, website 20%
        // (higher-tier customers skew more toward website/shopify)
        let platform;
        if (tierDef.tier === 'whale') {
          const r = rand();
          platform = r < 0.45 ? 'website' : r < 0.80 ? 'shopify' : 'ebay';
        } else if (tierDef.tier === 'highval') {
          const r = rand();
          platform = r < 0.25 ? 'website' : r < 0.65 ? 'shopify' : 'ebay';
        } else {
          const r = rand();
          platform = r < 0.40 ? 'ebay' : r < 0.75 ? 'shopify' : 'website';
        }

        const [city, state] = pick(CITIES);
        const address = {
          line1: `${between(100, 9999)} ${pick(['Main', 'Oak', 'Maple', 'Pine', 'Cedar', 'Elm'])} ${pick(['St', 'Ave', 'Blvd', 'Rd'])}`,
          city, state,
          zip: String(between(10000, 99999)),
          country: 'US',
        };
        const sfId = rand() < 0.40 ? `003${String(between(100000000, 999999999))}` : null;

        const info = insertCustomer.run(
          platform,
          `${platform.toUpperCase()}-CUST-${20000 + custIdx}`,
          first, last,
          `${first.toLowerCase()}.${last.toLowerCase()}${custIdx}@example.com`,
          `+1-${between(200, 999)}-${between(200, 999)}-${between(1000, 9999)}`,
          JSON.stringify(address),
          0, 0, null, null,
          JSON.stringify(tierDef.tier === 'whale' ? ['vip', 'gold'] : rand() < 0.3 ? ['vip'] : []),
          sfId,
        );

        customerIds.push({
          id: info.lastInsertRowid,
          platform,
          address,
          tier: tierDef.tier,
          orderBudget: between(tierDef.minOrders, tierDef.maxOrders),
          ordersPlaced: 0,
        });
        custIdx++;
      }
    }

    // ================================================================
    // ORDERS  (800, seasonal + platform weighted)
    // ================================================================
    // Story targets:
    //   eBay:    ~320 orders (40%), AOV ~$180  => ~$57,600 revenue
    //   Shopify: ~280 orders (35%), AOV ~$450  => ~$126,000 revenue
    //   Website: ~200 orders (25%), AOV ~$800  => ~$160,000 revenue
    //   eBay share of revenue: ~57.6k / (57.6+126+160) = ~16.7% (lower than orders share)
    //
    // The platform split is enforced by assigning exactly 320/280/200 orders per platform.

    const insertOrder = db.prepare(`
      INSERT INTO orders
        (platform_id, external_id, customer_id, status, total_amount, subtotal,
         shipping_cost, tax, discount, currency, items, shipping_address,
         ordered_at, shipped_at, delivered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?)
    `);

    const now = Date.now();
    const { buckets, cumWeights, totalWeight } = buildMonthBuckets(now);
    const customerStats = new Map(); // cid -> { count, value, first, last }

    // Build per-platform customer pools
    const poolByPlatform = {
      ebay:    customerIds.filter(c => c.platform === 'ebay'),
      shopify: customerIds.filter(c => c.platform === 'shopify'),
      website: customerIds.filter(c => c.platform === 'website'),
    };

    // Order assignment: 320 eBay, 280 Shopify, 200 Website
    const orderAssignments = [
      ...Array(320).fill('ebay'),
      ...Array(280).fill('shopify'),
      ...Array(200).fill('website'),
    ];

    // Shuffle the platform assignments so seasonal distribution applies uniformly
    // Use Fisher-Yates with our PRNG
    for (let i = orderAssignments.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [orderAssignments[i], orderAssignments[j]] = [orderAssignments[j], orderAssignments[i]];
    }

    let orderIdx = 1;
    for (const platform of orderAssignments) {
      const pool    = poolByPlatform[platform];
      const customer = pool.length > 0
        ? pool[Math.floor(rand() * pool.length)]
        : customerIds[Math.floor(rand() * customerIds.length)];

      const status = pick(ORDER_STATUS);

      // eBay: 1 line item; website: 1 (rarely 2); shopify: 1–2
      const maxLines = platform === 'ebay' ? 1 : platform === 'website' ? (rand() < 0.20 ? 2 : 1) : between(1, 2);
      const items    = [];
      let subtotal   = 0;

      for (let k = 0; k < maxLines; k++) {
        const prod = pickForPlatform(platform);
        const qty  = 1; // jewelry is always qty 1 per line for realism
        items.push({ product_id: prod.id, title: prod.title, qty, price: prod.price });
        subtotal += prod.price * qty;
      }
      subtotal = Math.round(subtotal * 100) / 100;

      const shipping = status === 'cancelled' ? 0 : Math.round((8 + rand() * 22) * 100) / 100;
      const tax      = Math.round(subtotal * 0.08 * 100) / 100;
      const discount = rand() < 0.15 ? Math.round(subtotal * (0.05 + rand() * 0.10) * 100) / 100 : 0;
      const total    = Math.round((subtotal + shipping + tax - discount) * 100) / 100;

      const bucket   = pickBucket(buckets, cumWeights, totalWeight);
      const ordered  = randInBucket(bucket);

      const shipped = ['shipped', 'delivered'].includes(status)
        ? new Date(ordered.getTime() + between(1, 4) * 24 * 60 * 60 * 1000)
        : null;
      const delivered = status === 'delivered'
        ? new Date(ordered.getTime() + between(4, 10) * 24 * 60 * 60 * 1000)
        : null;

      insertOrder.run(
        platform,
        `${platform.toUpperCase()}-ORD-${30000 + orderIdx}`,
        customer.id,
        status,
        total, subtotal, shipping, tax, discount,
        JSON.stringify(items),
        JSON.stringify(customer.address),
        ordered.toISOString(),
        shipped  ? shipped.toISOString()   : null,
        delivered ? delivered.toISOString() : null,
      );

      if (!['cancelled', 'refunded'].includes(status)) {
        const s = customerStats.get(customer.id) || { count: 0, value: 0, first: ordered, last: ordered };
        s.count += 1;
        s.value += total;
        if (ordered < s.first) s.first = ordered;
        if (ordered > s.last)  s.last  = ordered;
        customerStats.set(customer.id, s);
      }

      orderIdx++;
    }

    // Backfill customer LTV / order count
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

    // ================================================================
    // SALESFORCE OPPORTUNITIES  (50)
    // ================================================================
    const insertOpp = db.prepare(`
      INSERT INTO sf_opportunities
        (external_id, name, customer_id, stage, amount, close_date, probability, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const probMap = {
      'Prospecting':    10,
      'Qualification':  25,
      'Needs Analysis': 40,
      'Proposal':       60,
      'Negotiation':    80,
      'Closed Won':    100,
      'Closed Lost':     0,
    };

    for (let i = 1; i <= 50; i++) {
      const customer  = customerIds[Math.floor(rand() * customerIds.length)];
      const stageIdx  = weightedStageIndex();
      const stage     = SF_STAGES[stageIdx];
      const closeDate = new Date(now + between(-60, 120) * 24 * 60 * 60 * 1000);
      insertOpp.run(
        `006${String(between(100000000, 999999999))}`,
        `${pick(OPP_NAMES)} — ${pick(LAST_NAMES)}`,
        customer.id,
        stage,
        money(5000, 85000),
        closeDate.toISOString().slice(0, 10),
        probMap[stage] ?? 50,
        pick(OPP_DESCRIPTIONS),
      );
    }

    // ================================================================
    // SYNC LOGS  (8 per platform, ~1-in-8 chance of error)
    // ================================================================
    const insertLogSuccess = db.prepare(`
      INSERT INTO sync_logs (platform_id, status, records_synced, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertLogError = db.prepare(`
      INSERT INTO sync_logs (platform_id, status, records_synced, error_message, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const p of PLATFORMS) {
      for (let k = 0; k < 8; k++) {
        const t        = new Date(now - k * 6 * 60 * 60 * 1000);
        const complete = new Date(t.getTime() + between(3000, 9000));
        const isError  = rand() < 0.125; // ~1 in 8
        if (isError) {
          insertLogError.run(p, 'error', 0, pick(ERROR_MESSAGES), t.toISOString(), complete.toISOString());
        } else {
          insertLogSuccess.run(p, 'success', between(20, 250), t.toISOString(), complete.toISOString());
        }
      }
    }

    // Mark demo on
    db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('demo_mode', 'true', CURRENT_TIMESTAMP)`).run();
  });

  txn();
  return { products: 150, orders: 800, customers: 300, opportunities: 50 };
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
