import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { enabled } = await api.demoStatus();
      setEnabled(!!enabled);
    } catch (err) {
      console.error('demo status failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = useCallback(async () => {
    setBusy(true);
    try {
      if (enabled) await api.demoDisable();
      else         await api.demoEnable();
      await refresh();
      setTick((t) => t + 1); // tell consumers to refetch
    } finally {
      setBusy(false);
    }
  }, [enabled, refresh]);

  return (
    <DemoContext.Provider value={{ enabled, loading, busy, toggle, refresh, tick }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used inside DemoProvider');
  return ctx;
}
