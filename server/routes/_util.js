// Parse a JSON column safely (returns fallback on null/invalid).
export function parseJSON(value, fallback = null) {
  if (value == null) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

// Hydrate a row by parsing well-known JSON columns.
export function hydrate(row, jsonCols = []) {
  if (!row) return row;
  const out = { ...row };
  for (const c of jsonCols) out[c] = parseJSON(out[c], null);
  return out;
}

export const PLATFORM_IDS = ['ebay', 'shopify', 'website', 'salesforce'];
