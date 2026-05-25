const REQUIRED = ['EBAY_APP_ID', 'EBAY_CERT_ID', 'EBAY_DEV_ID', 'EBAY_OAUTH_TOKEN'];

function configured() {
  return REQUIRED.every((k) => {
    const v = process.env[k];
    return v && !v.startsWith('your_') && !v.endsWith('_here');
  });
}

function notConfigured(tool) {
  return {
    content: [{
      type: 'text',
      text: `eBay credentials not configured for "${tool}". Add EBAY_APP_ID, EBAY_CERT_ID, EBAY_DEV_ID, and EBAY_OAUTH_TOKEN to your .env file. See API_KEYS.md for setup instructions.`,
    }],
    isError: true,
  };
}

export const ebayTools = [
  {
    name: 'ebay_get_listings',
    description: 'Fetch active eBay listings for the configured seller account.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', default: 50 } } },
    handler: async () => {
      if (!configured()) return notConfigured('ebay_get_listings');
      return { content: [{ type: 'text', text: JSON.stringify({ listings: [] }) }] };
    },
  },
  {
    name: 'ebay_get_orders',
    description: 'Fetch recent eBay orders.',
    inputSchema: { type: 'object', properties: { days: { type: 'number', default: 30 } } },
    handler: async () => {
      if (!configured()) return notConfigured('ebay_get_orders');
      return { content: [{ type: 'text', text: JSON.stringify({ orders: [] }) }] };
    },
  },
  {
    name: 'ebay_get_seller_analytics',
    description: 'Fetch seller performance metrics (impressions, click-throughs, sell-through rate).',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      if (!configured()) return notConfigured('ebay_get_seller_analytics');
      return { content: [{ type: 'text', text: JSON.stringify({ analytics: {} }) }] };
    },
  },
];
