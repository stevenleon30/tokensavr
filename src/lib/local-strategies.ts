/**
 * Browser-local strategy storage.
 *
 * Lets signed-out users keep strategies on their own device (localStorage)
 * without creating an account. Nothing here ever leaves the browser.
 */

const KEY = "ts:localStrategies";
const MAX_ITEMS = 25;

export type LocalStrategyRecord = {
  /** Local-only id (not a database id). */
  id: string;
  savedAt: string;
  /** The full strategy payload as stored by the generator. */
  payload: Record<string, unknown> & { idea?: string; budget?: string };
};

function read(): LocalStrategyRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as LocalStrategyRecord[]) : [];
  } catch {
    return [];
  }
}

function write(items: LocalStrategyRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch (err) {
    console.warn("Local strategy save failed", err);
  }
}

export function listLocalStrategies(): LocalStrategyRecord[] {
  return read().sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export function getLocalStrategy(id: string): LocalStrategyRecord | null {
  return read().find((s) => s.id === id) ?? null;
}

export function saveLocalStrategy(payload: LocalStrategyRecord["payload"]): LocalStrategyRecord {
  const record: LocalStrategyRecord = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    payload,
  };
  write([record, ...read()]);
  return record;
}

export function deleteLocalStrategy(id: string) {
  write(read().filter((s) => s.id !== id));
}

export function clearLocalStrategies() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
