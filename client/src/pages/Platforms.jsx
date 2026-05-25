import { useCallback, useEffect, useState } from 'react';
import { RefreshCcw, CheckCircle2, XCircle, AlertCircle, Circle, Plug } from 'lucide-react';
import { api, formatRelative, PLATFORM_META } from '../lib/api.js';
import { useDemo } from '../context/DemoContext.jsx';

function statusIcon(status) {
  switch (status) {
    case 'connected':    return <CheckCircle2 className="text-emerald-500" size={18} />;
    case 'demo':         return <AlertCircle className="text-amber-500" size={18} />;
    case 'error':        return <XCircle className="text-rose-500" size={18} />;
    default:             return <Circle className="text-slate-300" size={18} />;
  }
}

export default function Platforms() {
  const { tick } = useDemo();
  const [platforms, setPlatforms] = useState([]);
  const [logsByPlatform, setLogs] = useState({});
  const [toast, setToast]         = useState(null);

  const load = useCallback(async () => {
    try {
      const { platforms } = await api.platforms();
      setPlatforms(platforms);
      const logsArr = await Promise.all(platforms.map((p) => api.platformLogs(p.id).then((r) => [p.id, r.logs])));
      setLogs(Object.fromEntries(logsArr));
    } catch { /* keep showing existing data on refetch error */ }
  }, []);

  useEffect(() => { load(); }, [load, tick]);

  async function sync(id) {
    try {
      await api.platformSync(id);
      setToast({ kind: 'ok', text: `${PLATFORM_META[id]?.label || id} sync complete.` });
    } catch (err) {
      setToast({
        kind: 'err',
        text: err?.body?.code === 'NOT_CONFIGURED'
          ? 'Configure credentials in .env to connect. See API_KEYS.md.'
          : err.message,
      });
    } finally {
      await load();
      setTimeout(() => setToast(null), 4000);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platforms</h1>
        <p className="text-sm text-slate-500">Sync status and connection health across every channel.</p>
      </div>

      {toast && (
        <div className={`px-4 py-3 rounded-lg text-sm ${toast.kind === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
          {toast.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {platforms.map((p) => {
          const logs  = logsByPlatform[p.id] || [];
          const last  = logs[0];
          const total = logs.reduce((sum, l) => sum + (l.records_synced || 0), 0);
          return (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {statusIcon(p.status)}
                  <div>
                    <div className="font-semibold text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-500 capitalize">{p.status} - {formatRelative(p.last_sync)}</div>
                  </div>
                </div>
                <button onClick={() => sync(p.id)} className="btn-ghost">
                  {p.status === 'disconnected' ? <Plug size={14} /> : <RefreshCcw size={14} />}
                  {p.status === 'disconnected' ? 'Connect' : 'Sync Now'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <Stat label="Configured" value={p.configured ? 'Yes' : 'No'} />
                <Stat label="Records (history)" value={total} />
                <Stat label="Logs"   value={logs.length} />
              </div>

              <div className="mt-4">
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Sync Log</div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="text-left p-2">When</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-right p-2">Records</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {logs.length === 0 && <tr><td colSpan={3} className="p-3 text-slate-500 text-center">No sync history.</td></tr>}
                      {logs.slice(0, 6).map((l) => (
                        <tr key={l.id}>
                          <td className="p-2">{formatRelative(l.started_at)}</td>
                          <td className="p-2">
                            <span className={`chip ${l.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{l.status}</span>
                          </td>
                          <td className="p-2 text-right">{l.records_synced}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}
