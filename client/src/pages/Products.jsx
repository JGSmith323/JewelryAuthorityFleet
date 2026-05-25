import { useEffect, useMemo, useState } from 'react';
import { Search, Package } from 'lucide-react';
import PlatformBadge from '../components/PlatformBadge.jsx';
import { api, formatCurrency, STATUS_META } from '../lib/api.js';
import { useDemo } from '../context/DemoContext.jsx';

const CATEGORIES = ['Ring','Necklace','Earring','Bracelet','Watch','Pendant'];
const PLATFORMS  = ['ebay','shopify','website'];
const STATUSES   = ['active','draft','sold','retired'];

export default function Products() {
  const { tick } = useDemo();
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState({ platform: '', category: '', status: '', search: '' });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let active = true;
    if (products.length === 0) setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v));
    api.products(params)
      .then((r) => { if (active) setProducts(r.products); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, tick]);

  const total = products.length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">Unified catalog across eBay, Shopify, and the business website.</p>
        </div>
        <div className="text-sm text-slate-500">{total} products</div>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="search"
            placeholder="Search by title, SKU, description..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <select className="px-3 py-2 rounded-lg border border-slate-200 text-sm" value={filters.platform} onChange={(e) => setFilters((f) => ({ ...f, platform: e.target.value }))}>
          <option value="">All Platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="px-3 py-2 rounded-lg border border-slate-200 text-sm" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">Platform</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Material</th>
                <th className="text-right p-3">Price</th>
                <th className="text-right p-3">Inventory</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && <tr><td colSpan={7} className="p-6 text-center text-slate-500">Loading...</td></tr>}
              {!loading && products.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">No products. Enable demo mode to populate.</td></tr>}
              {products.map((p) => (
                <tr key={p.id} className="table-row-hover cursor-pointer" onClick={() => setSelected(p)}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                        {p.images?.[0]
                          ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                          : <Package size={16} />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate max-w-md">{p.title}</div>
                        <div className="text-xs text-slate-500">SKU {p.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><PlatformBadge platform={p.platform_id} /></td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3">{p.material}</td>
                  <td className="p-3 text-right font-medium">{formatCurrency(p.price)}</td>
                  <td className="p-3 text-right">
                    <span className={p.inventory_qty <= 3 ? 'text-rose-600 font-semibold' : ''}>
                      {p.inventory_qty}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`chip ${STATUS_META[p.status] || 'bg-slate-100 text-slate-700'}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ProductModal({ product, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{product.title}</h3>
            <div className="text-xs text-slate-500">SKU {product.sku}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">×</button>
        </div>
        {product.images?.[0] && (
          <img src={product.images[0]} alt="" className="w-full h-48 object-cover rounded-lg mb-4" />
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Platform"><PlatformBadge platform={product.platform_id} /></Field>
          <Field label="Category">{product.category}</Field>
          <Field label="Material">{product.material}</Field>
          <Field label="Weight">{product.weight_grams} g</Field>
          <Field label="Price">{formatCurrency(product.price)}</Field>
          <Field label="Cost">{formatCurrency(product.cost)}</Field>
          <Field label="Inventory">{product.inventory_qty}</Field>
          <Field label="Status"><span className={`chip ${STATUS_META[product.status] || 'bg-slate-100 text-slate-700'}`}>{product.status}</span></Field>
        </div>
        {product.description && (
          <div className="mt-4 text-sm text-slate-600 border-t border-slate-200 pt-3">{product.description}</div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-slate-900 mt-0.5">{children}</div>
    </div>
  );
}
