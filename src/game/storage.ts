export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function memoryStorage(): KeyValueStorage {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  }
}

// Shared so every caller in this tab sees the same data when sessionStorage is unavailable.
let fallback: KeyValueStorage | undefined

/**
 * sessionStorage is per tab and survives a reload: a refresh rejoins the same seat,
 * while several tabs in one browser are separate players.
 */
export function browserStorage(): KeyValueStorage {
  try {
    const s = window.sessionStorage
    const probe = '__who-am-i__'
    s.setItem(probe, probe)
    s.removeItem(probe)
    // Full or blocked storage must never break the game, only reloads.
    const safe =
      <A extends unknown[], R>(f: (...a: A) => R, fallback: R) =>
      (...a: A) => {
        try {
          return f(...a)
        } catch {
          return fallback
        }
      }
    return {
      getItem: safe((k: string) => s.getItem(k), null),
      setItem: safe((k: string, v: string) => s.setItem(k, v), undefined),
      removeItem: safe((k: string) => s.removeItem(k), undefined),
    }
  } catch {
    fallback ??= memoryStorage()
    return fallback
  }
}

export function readJson<T>(storage: KeyValueStorage, key: string): T | null {
  const raw = storage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeJson(storage: KeyValueStorage, key: string, value: unknown) {
  storage.setItem(key, JSON.stringify(value))
}
