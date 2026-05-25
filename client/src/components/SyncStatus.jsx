import { PLATFORM_META, formatRelative } from '../lib/api.js';

const STATUS_DOT = {
  connected:    'bg-emerald-500',
  demo:         'bg-amber-500',
  disconnected: 'bg-slate-300',
  error:        'bg-rose-500',
};
const STATUS_LABEL = {
  connected:    'Connected',
  demo:         'Demo Mode',
  disconnected: 'Disconnected',
  error:        'Error',
};

export default function SyncStatus({ platform }) {
  const meta = PLATFORM_META[platform.id] || { label: platform.name };
  const dot  = STATUS_DOT[platform.status] || STATUS_DOT.disconnected;
  return (
    <div className="card flex items-center gap-3">
      <span className={`inline-block w-3 h-3 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm text-slate-900 truncate">{meta.label}</div>
        <div className="text-xs text-slate-500">
          {STATUS_LABEL[platform.status] || platform.status} - {formatRelative(platform.last_sync)}
        </div>
      </div>
    </div>
  );
}
