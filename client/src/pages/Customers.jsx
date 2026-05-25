import { useEffect, useState } from 'react';
import { Search, Crown } from 'lucide-react';
import PlatformBadge from '../components/PlatformBadge.jsx';
import { api, formatCurrency, formatDate } from '../lib/api.js';
import { useDemo } from '../context/DemoContext.jsx';

const PLATFORMS = ['ebay','shopify','website'];

function ltvTier(ltv) {
  if (ltv >= 5000) return { label: 'GOLD',    color: 'bg-amber-100 text-amber-800 border-amber-200' };
  if (ltv >= 1500) return { label: 'SILVER',  color: 'bg-slate-200 text-slate-800 border-slate-300' };
  if (ltv > 0)     return { label: 'BRONZE',  color: 'bg-orange-100 text-orange-800 border-orange-200' };
  return null;
}

export default function Customers() {
  const { tick } = useDemo();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ platform: '', search: '' });

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v));
    api.customers(params).then((r) => { if (active) setRows(r.customers); }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [filters, tick]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <p className="text-sm text-slate-500">Unified customer list with lifetime value tiers.</p>
      </div>

      <div className="card flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="search"
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <select className="px-3 py-2 rounded-lg border border-slate-200 text-sm" value={filters.platform} onChange={(e) => setFilters((f) => ({ ...f, platform: e.target.value }))}>
          <option value="">All Platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Platform</th>
                <th className="text-right p-3">Orders</th>
                <th className="text-right p-3">Lifetime Value</th>
                <th className="text-left p-3">Tier</th>
                <th className="text-left p-3">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && <tr><td colSpan={7} className="p-6 text-center text-slate-500">Loading...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">No customers. Enable demo mode to populate.</td></tr>}
              {rows.map((c) => {
                const tier = ltvTier(c.lifetime_value);
                return (
                  <tr key={c.id} className="table-row-hover">
                    <td className="p-3">
                      <div className="font-medium text-slate-900 flex items-center gap-1.5">
                        {tier?.label === 'GOLD' && <Crown size={14} className="text-amber-500" />}
                        {c.first_name} {c.last_name}
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">{c.email}</td>
                    <td className="p-3"><PlatformBadge platform={c.platform_id} /></td>
                    <td className="p-3 text-right">{c.total_orders}</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(c.lifetime_value)}</td>
                    <td className="p-3">{tier && <span className={`chip border ${tier.color}`}>{tier.label}</span>}</td>
                    <td className="p-3 text-slate-600">{formatDate(c.last_order_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
