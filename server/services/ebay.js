export class ConfigurationError extends Error {
  constructor(message, platform) {
    super(message);
    this.name = 'ConfigurationError';
    this.platform = platform;
    this.code = 'NOT_CONFIGURED';
  }
}

const REQUIRED = ['EBAY_APP_ID', 'EBAY_CERT_ID', 'EBAY_DEV_ID', 'EBAY_OAUTH_TOKEN'];

function isPlaceholder(v) {
  return !v || v.startsWith('your_') || v.endsWith('_here');
}

export function isConfigured() {
  return REQUIRED.every((k) => !isPlaceholder(process.env[k]));
}

function ensureConfigured() {
  if (!isConfigured()) {
    throw new ConfigurationError(
      'eBay API credentials not configured. See API_KEYS.md for setup instructions.',
      'ebay',
    );
  }
}

export async function getListings() {
  ensureConfigured();
  // Real implementation would call the eBay Sell APIs here.
  return [];
}

export async function getOrders() {
  ensureConfigured();
  return [];
}

export async function getSellerAnalytics() {
  ensureConfigured();
  return {};
}
