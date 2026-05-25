import { TrendingDown, TrendingUp } from 'lucide-react';

export default function StatCard({ label, value, trend, icon: Icon, accent = 'gold' }) {
  const accentMap = {
    gold:    'bg-amber-50 text-gold-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    sky:     'bg-sky-50 text-sky-600',
    rose:    'bg-rose-50 text-rose-600',
  };

  const trendPositive = typeof trend === 'number' && trend >= 0;
  const trendLabel = trend == null
    ? null
    : `${trendPositive ? '+' : ''}${trend.toFixed(1)}%`;

  return (
    <div className="card flex items-center gap-4">
      {Icon && (
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${accentMap[accent] || accentMap.gold}`}>
          <Icon size={22} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">{label}</div>
        <div className="text-2xl font-bold text-slate-900 mt-0.5 truncate">{value}</div>
        {trendLabel && (
          <div className={`text-xs mt-1 flex items-center gap-1 ${trendPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trendPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trendLabel} <span className="text-slate-400">vs prior 30d</span>
          </div>
        )}
      </div>
    </div>
  );
}
