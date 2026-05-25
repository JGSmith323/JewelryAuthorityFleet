function configured() {
  const dom = process.env.SHOPIFY_STORE_DOMAIN;
  const tok = process.env.SHOPIFY_ACCESS_TOKEN;
  return dom && tok &&
    !dom.includes('your-store') && !tok.startsWith('your_');
}

function notConfigured(tool) {
  return {
    content: [{
      type: 'text',
      text: `Shopify credentials not configured for "${tool}". Add SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN to your .env file. See API_KEYS.md for setup instructions.`,
    }],
    isError: true,
  };
}

export const shopifyTools = [
  {
    name: 'shopify_get_products',
    description: 'Fetch the Shopify product catalog.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', default: 50 } } },
    handler: async () => {
      if (!configured()) return notConfigured('shopify_get_products');
      return { content: [{ type: 'text', text: JSON.stringify({ products: [] }) }] };
    },
  },
  {
    name: 'shopify_get_orders',
    description: 'Fetch recent Shopify orders.',
    inputSchema: { type: 'object', properties: { days: { type: 'number', default: 30 } } },
    handler: async () => {
      if (!configured()) return notConfigured('shopify_get_orders');
      return { content: [{ type: 'text', text: JSON.stringify({ orders: [] }) }] };
    },
  },
  {
    name: 'shopify_get_customers',
    description: 'Fetch Shopify customers.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', default: 50 } } },
    handler: async () => {
      if (!configured()) return notConfigured('shopify_get_customers');
      return { content: [{ type: 'text', text: JSON.stringify({ customers: [] }) }] };
    },
  },
  {
    name: 'shopify_get_analytics',
    description: 'Fetch Shopify store analytics (sales, sessions, conversion).',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      if (!configured()) return notConfigured('shopify_get_analytics');
      return { content: [{ type: 'text', text: JSON.stringify({ analytics: {} }) }] };
    },
  },
];
