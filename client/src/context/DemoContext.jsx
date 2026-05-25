import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy]       = useState(false);
  const [tick, setTick]       = useState(0);
  const busyRef               = useRef(false); // guard against double-clicks

  // Fetch true state from server on mount (silent — no disabled flash)
  useEffect(() => {
    api.demoStatus()
      .then(({ enabled }) => setEnabled(!!enabled))
      .catch(() => {}); // server may not be up yet
  }, []);

  const toggle = useCallback(async () => {
    if (busyRef.current) return; // hard guard
    busyRef.current = true;
    setBusy(true);

    const next = !enabled;
    setEnabled(next); // optimistic — UI flips instantly

    try {
      if (next) await api.demoEnable();
      else      await api.demoDisable();
      setTick((t) => t + 1); // signal all pages to refetch
    } catch {
      setEnabled(!next); // roll back on error
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [enabled]);

  return (
    <DemoContext.Provider value={{ enabled, busy, toggle, tick }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used inside DemoProvider');
  return ctx;
}
