import { useEffect, useState } from 'react';
import PlatformBadge from '../components/PlatformBadge.jsx';
import { api, formatCurrency, formatDate, STATUS_META } from '../lib/api.js';
import { useDemo } from '../context/DemoContext.jsx';

const STATUSES  = ['pending','processing','shipped','delivered','cancelled','refunded'];
const PLATFORMS = ['ebay','shopify','website'];

export default function Orders() {
  const { tick } = useDemo();
  const [orders, setOrders] = useState([]);
  const [stats, setStats]   = useState({ count: 0, total_value: 0, avg_value: 0, pending_count: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ platform: '', status: '' });

  useEffect(() => {
    let active = true;
    if (orders.length === 0) setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v));
    api.orders(params)
      .then((r) => {
        if (!active) return;
        setOrders(r.orders);
        setStats(r.stats || { count: 0, total_value: 0, avg_value: 0, pending_count: 0 });
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, tick]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="text-sm text-slate-500">Order feed across every channel.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Stat label="Orders"          value={stats.count} />
        <Stat label="Total Value"     value={formatCurrency(stats.total_value)} />
        <Stat label="Avg Order Value" value={formatCurrency(stats.avg_value)} />
        <Stat label="Pending"         value={stats.pending_count} />
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3">
        <select className="px-3 py-2 rounded-lg border border-slate-200 text-sm" value={filters.platform} onChange={(e) => setFilters((f) => ({ ...f, platform: e.target.value }))}>
          <option value="">All Platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="px-3 py-2 rounded-lg border border-slate-200 text-sm" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left p-3">Order #</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Platform</th>
                <th className="text-right p-3">Items</th>
                <th className="text-right p-3">Total</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Ordered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && <tr><td colSpan={7} className="p-6 text-center text-slate-500">Loading...</td></tr>}
              {!loading && orders.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">No orders. Enable demo mode to populate.</td></tr>}
              {orders.map((o) => (
                <tr key={o.id} className="table-row-hover">
                  <td className="p-3 font-mono text-xs text-slate-700">{o.external_id || `#${o.id}`}</td>
                  <td className="p-3">
                    <div className="font-medium text-slate-900">{o.customer_name || 'Guest'}</div>
                    <div className="text-xs text-slate-500">{o.customer_email}</div>
                  </td>
                  <td className="p-3"><PlatformBadge platform={o.platform_id} /></td>
                  <td className="p-3 text-right">{o.items?.length ?? 0}</td>
                  <td className="p-3 text-right font-semibold">{formatCurrency(o.total_amount)}</td>
                  <td className="p-3"><span className={`chip ${STATUS_META[o.status] || 'bg-slate-100 text-slate-700'}`}>{o.status}</span></td>
                  <td className="p-3 text-slate-600">{formatDate(o.ordered_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}
