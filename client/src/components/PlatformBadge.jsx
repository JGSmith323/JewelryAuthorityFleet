import { PLATFORM_META } from '../lib/api.js';

export default function PlatformBadge({ platform, withDot = true, className = '' }) {
  const meta = PLATFORM_META[platform] || { label: platform, color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
  return (
    <span className={`chip border ${meta.color} ${className}`}>
      {withDot && <span className={`inline-block w-1.5 h-1.5 rounded-full ${meta.dot} mr-1.5`} />}
      {meta.label}
    </span>
  );
}
