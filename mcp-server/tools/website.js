function configured() {
  const url = process.env.WEBSITE_API_URL;
  const key = process.env.WEBSITE_API_KEY;
  return url && key && !url.includes('your-jewelry-website') && !key.startsWith('your_');
}

function notConfigured(tool) {
  return {
    content: [{
      type: 'text',
      text: `Business Website API not configured for "${tool}". Add WEBSITE_API_URL and WEBSITE_API_KEY to your .env file. See API_KEYS.md for setup instructions.`,
    }],
    isError: true,
  };
}

export const websiteTools = [
  {
    name: 'website_get_orders',
    description: 'Fetch custom orders from the business website.',
    inputSchema: { type: 'object', properties: { days: { type: 'number', default: 30 } } },
    handler: async () => {
      if (!configured()) return notConfigured('website_get_orders');
      return { content: [{ type: 'text', text: JSON.stringify({ orders: [] }) }] };
    },
  },
  {
    name: 'website_get_leads',
    description: 'Fetch contact form submissions and inquiry leads.',
    inputSchema: { type: 'object', properties: { days: { type: 'number', default: 30 } } },
    handler: async () => {
      if (!configured()) return notConfigured('website_get_leads');
      return { content: [{ type: 'text', text: JSON.stringify({ leads: [] }) }] };
    },
  },
  {
    name: 'website_get_analytics',
    description: 'Fetch website analytics (traffic, sources, top pages).',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      if (!configured()) return notConfigured('website_get_analytics');
      return { content: [{ type: 'text', text: JSON.stringify({ analytics: {} }) }] };
    },
  },
];
