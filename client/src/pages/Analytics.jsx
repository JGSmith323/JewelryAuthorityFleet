import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { api, formatCurrency } from '../lib/api.js';
import { useDemo } from '../context/DemoContext.jsx';

const PLATFORM_COLORS = {
  ebay: '#0064D2', shopify: '#7AB55C', website: '#7C3AED', salesforce: '#00A1E0',
};

export default function Analytics() {
  const { tick } = useDemo();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.analyticsRevenue(),
      api.analyticsOrders(),
      api.analyticsProducts(),
      api.analyticsCustomers(),
    ]).then(([rev, ord, prod, cust]) => {
      if (active) setData({ rev, ord, prod, cust });
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [tick]);

  if (loading || !data) {
    return <div className="text-slate-500">Loading analytics...</div>;
  }

  // ---- pivot helpers ----
  const months = [...new Set(data.rev.byPlatformMonth.map((r) => r.month))].sort();
  const lineData = months.map((m) => {
    const row = { month: m };
    for (const p of ['ebay','shopify','website']) {
      const f = data.rev.byPlatformMonth.find((r) => r.month === m && r.platform_id === p);
      row[p] = f ? f.revenue : 0;
    }
    return row;
  });

  const categoryData = data.rev.byCategory.slice(0, 10);

  const platformCmp = data.rev.byPlatformTotal.map((p) => ({
    platform: p.platform_id,
    revenue: p.revenue,
    orders: p.orders,
    avg: p.orders ? Math.round((p.revenue / p.orders) * 100) / 100 : 0,
  }));

  const acqData = data.cust.newPerMonth;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">Deep dive across platforms, categories, and customers.</p>
      </div>

      <div className="card">
        <div className="font-semibold text-slate-900 mb-4">Revenue Over Time (12 months)</div>
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Line type="monotone" dataKey="ebay"    stroke={PLATFORM_COLORS.ebay}    strokeWidth={2} name="eBay" />
              <Line type="monotone" dataKey="shopify" stroke={PLATFORM_COLORS.shopify} strokeWidth={2} name="Shopify" />
              <Line type="monotone" dataKey="website" stroke={PLATFORM_COLORS.website} strokeWidth={2} name="Website" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="font-semibold text-slate-900 mb-4">Revenue by Category</div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="category" stroke="#64748b" fontSize={12} width={80} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#D97706" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="font-semibold text-slate-900 mb-4">Platform Comparison</div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={platformCmp}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="platform" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="#10B981" name="Orders" />
                <Bar dataKey="avg"    fill="#D97706" name="Avg Order Value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="font-semibold text-slate-900 mb-4">Customer Acquisition (new customers per month)</div>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={acqData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" name="New Customers" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
