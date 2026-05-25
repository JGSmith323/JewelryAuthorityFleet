import { Sparkles, Zap } from 'lucide-react';
import { useDemo } from '../context/DemoContext.jsx';

export default function DemoToggle() {
  const { enabled, busy, toggle } = useDemo();

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`
        relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
        border transition-all duration-200 select-none
        ${busy ? 'opacity-70 cursor-wait' : 'cursor-pointer'}
        ${enabled
          ? 'bg-gradient-to-r from-amber-500 to-yellow-400 border-amber-400 text-white shadow-md hover:shadow-lg hover:from-amber-600 hover:to-yellow-500'
          : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white'
        }
      `}
      title={enabled ? 'Turn off demo mode' : 'Turn on demo mode with sample data'}
    >
      {/* Animated icon swap */}
      <span className="transition-transform duration-150">
        {enabled
          ? <Sparkles size={15} className="text-white" />
          : <Zap size={15} className="text-slate-400" />
        }
      </span>

      <span className="tracking-wide">
        {busy ? 'Loading…' : enabled ? 'DEMO ON' : 'DEMO OFF'}
      </span>

      {/* Live dot when enabled */}
      {enabled && !busy && (
        <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
      )}
    </button>
  );
}
