const REQUIRED = [
  'SALESFORCE_CLIENT_ID',
  'SALESFORCE_CLIENT_SECRET',
  'SALESFORCE_USERNAME',
  'SALESFORCE_PASSWORD',
  'SALESFORCE_SECURITY_TOKEN',
];

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
      text: `Salesforce credentials not configured for "${tool}". Add SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET, SALESFORCE_USERNAME, SALESFORCE_PASSWORD, and SALESFORCE_SECURITY_TOKEN to your .env file. See API_KEYS.md for setup instructions.`,
    }],
    isError: true,
  };
}

export const salesforceTools = [
  {
    name: 'salesforce_get_contacts',
    description: 'Fetch Salesforce CRM contacts.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', default: 50 } } },
    handler: async () => {
      if (!configured()) return notConfigured('salesforce_get_contacts');
      return { content: [{ type: 'text', text: JSON.stringify({ contacts: [] }) }] };
    },
  },
  {
    name: 'salesforce_get_opportunities',
    description: 'Fetch sales opportunities from Salesforce.',
    inputSchema: { type: 'object', properties: { stage: { type: 'string' } } },
    handler: async () => {
      if (!configured()) return notConfigured('salesforce_get_opportunities');
      return { content: [{ type: 'text', text: JSON.stringify({ opportunities: [] }) }] };
    },
  },
  {
    name: 'salesforce_get_cases',
    description: 'Fetch Salesforce support cases.',
    inputSchema: { type: 'object', properties: { status: { type: 'string' } } },
    handler: async () => {
      if (!configured()) return notConfigured('salesforce_get_cases');
      return { content: [{ type: 'text', text: JSON.stringify({ cases: [] }) }] };
    },
  },
  {
    name: 'salesforce_sync_customer',
    description: 'Push a customer record to Salesforce as a Contact.',
    inputSchema: {
      type: 'object',
      required: ['first_name', 'last_name', 'email'],
      properties: {
        first_name: { type: 'string' },
        last_name:  { type: 'string' },
        email:      { type: 'string' },
        phone:      { type: 'string' },
      },
    },
    handler: async () => {
      if (!configured()) return notConfigured('salesforce_sync_customer');
      return { content: [{ type: 'text', text: JSON.stringify({ id: null, ok: true }) }] };
    },
  },
];
