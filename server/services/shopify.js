import { ConfigurationError } from './ebay.js';

const REQUIRED = ['SHOPIFY_STORE_DOMAIN', 'SHOPIFY_ACCESS_TOKEN'];

function isPlaceholder(v) {
  return !v || v.startsWith('your_') || v.endsWith('_here') || v.includes('your-store');
}

export function isConfigured() {
  return REQUIRED.every((k) => !isPlaceholder(process.env[k]));
}

function ensureConfigured() {
  if (!isConfigured()) {
    throw new ConfigurationError(
      'Shopify API credentials not configured. See API_KEYS.md for setup instructions.',
      'shopify',
    );
  }
}

export async function getProducts() { ensureConfigured(); return []; }
export async function getOrders()   { ensureConfigured(); return []; }
export async function getCustomers(){ ensureConfigured(); return []; }
export async function getAnalytics(){ ensureConfigured(); return {}; }
