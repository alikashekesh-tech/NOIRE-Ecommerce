import { useSyncExternalStore } from 'react'

/**
 * Tiny persisted store (localStorage) for per-visitor conveniences: bag contents,
 * wishlist and preferences. Product data, prices and stock always come from the API.
 */
export function createPersistedStore<T>(key: string, initial: T) {
  let state: T = initial
  try {
    const raw = localStorage.getItem(key)
    if (raw) state = JSON.parse(raw) as T
  } catch {
    /* private mode / blocked storage: keep in-memory state */
  }
  const listeners = new Set<() => void>()

  const set = (next: T | ((prev: T) => T)) => {
    state = typeof next === 'function' ? (next as (p: T) => T)(state) : next
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l())
  }

  const subscribe = (l: () => void) => {
    listeners.add(l)
    const onStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          state = JSON.parse(e.newValue)
          l()
        } catch {
          /* ignore */
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(l)
      window.removeEventListener('storage', onStorage)
    }
  }

  const get = () => state
  const use = () => useSyncExternalStore(subscribe, get, get)

  return { get, set, use }
}
