import { Sparkles, Zap } from 'lucide-react';
import { useDemo } from '../context/DemoContext.jsx';

export default function DemoToggle() {
  const { enabled, busy, toggle, loading } = useDemo();

  return (
    <button
      onClick={toggle}
      disabled={busy || loading}
      className={`btn font-semibold transition-all ${
        enabled
          ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-white shadow-md hover:shadow-lg'
          : 'bg-slate-900 text-white hover:bg-slate-800'
      } ${(busy || loading) ? 'opacity-60 cursor-not-allowed' : ''}`}
      title={enabled ? 'Disable demo mode and clear sample data' : 'Enable demo mode with sample data'}
    >
      {enabled ? <Sparkles size={16} /> : <Zap size={16} />}
      <span>{busy ? 'Working...' : enabled ? 'DEMO MODE: ON' : 'DEMO MODE: OFF'}</span>
    </button>
  );
}
