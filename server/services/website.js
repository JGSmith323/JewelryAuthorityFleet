import { ConfigurationError } from './ebay.js';

const REQUIRED = ['WEBSITE_API_URL', 'WEBSITE_API_KEY'];

function isPlaceholder(v) {
  return !v || v.startsWith('your_') || v.endsWith('_here') || v.includes('your-jewelry-website');
}

export function isConfigured() {
  return REQUIRED.every((k) => !isPlaceholder(process.env[k]));
}

function ensureConfigured() {
  if (!isConfigured()) {
    throw new ConfigurationError(
      'Business Website API not configured. See API_KEYS.md for setup instructions.',
      'website',
    );
  }
}

export async function getOrders()    { ensureConfigured(); return []; }
export async function getLeads()     { ensureConfigured(); return []; }
export async function getAnalytics() { ensureConfigured(); return {}; }
