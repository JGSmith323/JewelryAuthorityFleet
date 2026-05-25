const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const ct = res.headers.get('content-type') || '';
  const body = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const err = new Error(body?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export const api = {
  health:           ()              => request('/health'),

  demoStatus:       ()              => request('/demo/status'),
  demoEnable:       ()              => request('/demo/enable',  { method: 'POST' }),
  demoDisable:      ()              => request('/demo/disable', { method: 'POST' }),

  platforms:        ()              => request('/platforms'),
  platformLogs:     (id)            => request(`/platforms/${id}/logs`),
  platformSync:     (id)            => request(`/platforms/${id}/sync`, { method: 'POST' }),

  products:         (params = {})   => request(`/products?${new URLSearchParams(params)}`),
  orders:           (params = {})   => request(`/orders?${new URLSearchParams(params)}`),
  customers:        (params = {})   => request(`/customers?${new URLSearchParams(params)}`),

  analyticsRevenue: ()              => request('/analytics/revenue'),
  analyticsOrders:  ()              => request('/analytics/orders'),
  analyticsProducts:()              => request('/analytics/products'),
  analyticsCustomers:()             => request('/analytics/customers'),

  chatStatus:       ()              => request('/chat/status'),
  chatSend:         (messages, sessionId) =>
    request('/chat', { method: 'POST', body: JSON.stringify({ messages, sessionId }) }),
  chatHistory:      (sessionId)     => request(`/chat/history?sessionId=${encodeURIComponent(sessionId)}`),
  chatClear:        (sessionId)     => request(`/chat/history?sessionId=${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),
};

export const PLATFORM_META = {
  ebay:       { label: 'eBay',             color: 'bg-blue-100 text-blue-800 border-blue-200',     dot: 'bg-blue-500' },
  shopify:    { label: 'Shopify',          color: 'bg-green-100 text-green-800 border-green-200',  dot: 'bg-green-500' },
  website:    { label: 'Business Website', color: 'bg-purple-100 text-purple-800 border-purple-200',dot: 'bg-purple-500' },
  salesforce: { label: 'Salesforce',       color: 'bg-sky-100 text-sky-800 border-sky-200',         dot: 'bg-sky-500' },
};

export const STATUS_META = {
  pending:    'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped:    'bg-indigo-100 text-indigo-800',
  delivered:  'bg-emerald-100 text-emerald-800',
  cancelled:  'bg-rose-100 text-rose-800',
  refunded:   'bg-slate-200 text-slate-800',
  active:     'bg-emerald-100 text-emerald-800',
  draft:      'bg-slate-100 text-slate-700',
  sold:       'bg-amber-100 text-amber-800',
  retired:    'bg-slate-200 text-slate-700',
};

export function formatCurrency(n) {
  if (n == null || isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export function formatDate(s) {
  if (!s) return '-';
  try { return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return s; }
}

export function formatRelative(s) {
  if (!s) return 'never';
  const ms = Date.now() - new Date(s).getTime();
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}
