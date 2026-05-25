import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

const LS_KEY = 'ja_demo_enabled';

// Read last-known state from localStorage so the UI starts correct on every
// page load — no false→true flash when demo was already on.
function readCached() {
  try { return localStorage.getItem(LS_KEY) === 'true'; } catch { return false; }
}
function writeCache(val) {
  try { localStorage.setItem(LS_KEY, val ? 'true' : 'false'); } catch {}
}

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [enabled, setEnabled] = useState(readCached);   // start from cache, no flash
  const [busy, setBusy]       = useState(false);
  const [tick, setTick]       = useState(0);
  const busyRef               = useRef(false);
  const fetchedRef            = useRef(false);           // prevent StrictMode double-fetch

  // Sync true state from server once on mount (silent, already showing cached value)
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    api.demoStatus()
      .then(({ enabled: e }) => {
        const next = !!e;
        setEnabled(next);
        writeCache(next);
      })
      .catch(() => {}); // server not up yet — keep cached value
  }, []);

  const toggle = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);

    const next = !enabled;
    setEnabled(next);      // optimistic — instant UI flip
    writeCache(next);      // persist immediately so reload is also correct

    try {
      if (next) await api.demoEnable();
      else      await api.demoDisable();
      setTick((t) => t + 1);
    } catch {
      // Roll back both state and cache on error
      setEnabled(!next);
      writeCache(!next);
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
