import { ConfigurationError } from './ebay.js';

const REQUIRED = [
  'SALESFORCE_CLIENT_ID',
  'SALESFORCE_CLIENT_SECRET',
  'SALESFORCE_USERNAME',
  'SALESFORCE_PASSWORD',
  'SALESFORCE_SECURITY_TOKEN',
];

function isPlaceholder(v) {
  return !v || v.startsWith('your_') || v.endsWith('_here');
}

export function isConfigured() {
  return REQUIRED.every((k) => !isPlaceholder(process.env[k]));
}

function ensureConfigured() {
  if (!isConfigured()) {
    throw new ConfigurationError(
      'Salesforce credentials not configured. See API_KEYS.md for setup instructions.',
      'salesforce',
    );
  }
}

export async function getContacts()      { ensureConfigured(); return []; }
export async function getOpportunities() { ensureConfigured(); return []; }
export async function getCases()         { ensureConfigured(); return []; }
export async function syncCustomer(_)    { ensureConfigured(); return { id: null }; }
