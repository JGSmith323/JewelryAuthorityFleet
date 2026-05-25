import { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, Package, UserPlus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import StatCard from '../components/StatCard.jsx';
import SyncStatus from '../components/SyncStatus.jsx';
import PlatformBadge from '../components/PlatformBadge.jsx';
import { api, formatCurrency, formatDate, STATUS_META, PLATFORM_META } from '../lib/api.js';
import { useDemo } from '../context/DemoContext.jsx';

const PLATFORM_COLORS = {
  ebay: '#0064D2', shopify: '#7AB55C', website: '#7C3AED', salesforce: '#00A1E0',
};
const STATUS_COLORS = ['#10B981','#6366F1','#3B82F6','#F59E0B','#F43F5E','#94A3B8'];

function trendPct(curr, prev) {
  if (!prev) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

export default function Dashboard() {
  const { tick } = useDemo();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const [rev, ord, prod, cust, platforms, orders] = await Promise.all([
          api.analyticsRevenue(),
          api.analyticsOrders(),
          api.analyticsProducts(),
          api.analyticsCustomers(),
          api.platforms(),
          api.orders({ limit: 10 }),
        ]);
        if (active) setData({ rev, ord, prod, cust, platforms: platforms.platforms, orders: orders.orders });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [tick]);

  if (loading || !data) {
    return <div className="text-slate-500">Loading dashboard...</div>;
  }

  const revTrend = trendPct(data.rev.last30.revenue, data.rev.prev30.revenue);
  const ordTrend = trendPct(data.rev.last30.orders,  data.rev.prev30.orders);
  const custTrend= trendPct(data.cust.newLast30,     data.cust.newPrev30);

  // pivot byPlatformMonth into stacked-bar shape: [{month, ebay, shopify, website}, ...]
  const monthsSet = new Set(data.rev.byPlatformMonth.map((r) => r.month));
  const months = [...monthsSet].sort().slice(-6);
  const stackedData = months.map((m) => {
    const row = { month: m };
    for (const p of ['ebay','shopify','website']) {
      const found = data.rev.byPlatformMonth.find((r) => r.month === m && r.platform_id === p);
      row[p] = found ? found.revenue : 0;
    }
    return row;
  });

  const statusData = data.ord.byStatus.map((r) => ({ name: r.status, value: r.count }));

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue (30d)"      value={formatCurrency(data.rev.last30.revenue)} trend={revTrend} icon={DollarSign} accent="gold" />
        <StatCard label="Orders (30d)"       value={data.rev.last30.orders}                   trend={ordTrend} icon={ShoppingBag} accent="emerald" />
        <StatCard label="Active Products"    value={data.prod.counts.active}                  icon={Package}    accent="sky" />
        <StatCard label="New Customers (30d)" value={data.cust.newLast30}                     trend={custTrend} icon={UserPlus}  accent="rose" />
      </div>

      {/* Platform health row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.platforms.map((p) => <SyncStatus key={p.id} platform={p} />)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="font-semibold text-slate-900 mb-4">Revenue by Platform - Last 6 Months</div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={stackedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="ebay"    stackId="a" fill={PLATFORM_COLORS.ebay} name="eBay" />
                <Bar dataKey="shopify" stackId="a" fill={PLATFORM_COLORS.shopify} name="Shopify" />
                <Bar dataKey="website" stackId="a" fill={PLATFORM_COLORS.website} name="Website" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="font-semibold text-slate-900 mb-4">Order Status</div>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {statusData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top products + recent orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="font-semibold text-slate-900 mb-4">Top 5 Products by Revenue</div>
          <div className="divide-y divide-slate-200">
            {data.prod.topByRevenue.slice(0, 5).map((p, i) => (
              <div key={p.id} className="py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-gold-500/10 text-gold-600 flex items-center justify-center text-xs font-bold">{i+1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{p.title}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <PlatformBadge platform={p.platform_id} /> {p.units} units sold
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-900">{formatCurrency(p.revenue)}</div>
              </div>
            ))}
            {data.prod.topByRevenue.length === 0 && <div className="text-sm text-slate-500 py-4">No order data yet. Enable demo mode.</div>}
          </div>
        </div>

        <div className="card">
          <div className="font-semibold text-slate-900 mb-4">Recent Orders</div>
          <div className="divide-y divide-slate-200">
            {data.orders.slice(0, 10).map((o) => (
              <div key={o.id} className="py-2.5 flex items-center gap-3">
                <PlatformBadge platform={o.platform_id} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-900 truncate">{o.customer_name || 'Guest'}</div>
                  <div className="text-xs text-slate-500">{formatDate(o.ordered_at)}</div>
                </div>
                <span className={`chip ${STATUS_META[o.status] || 'bg-slate-100 text-slate-700'}`}>{o.status}</span>
                <div className="text-sm font-medium text-slate-900 w-20 text-right">{formatCurrency(o.total_amount)}</div>
              </div>
            ))}
            {data.orders.length === 0 && <div className="text-sm text-slate-500 py-4">No orders yet. Enable demo mode.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
