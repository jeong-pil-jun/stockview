import { useSyncExternalStore } from 'react';

export interface Store<T> {
  get: () => T;
  set: (v: T | ((prev: T) => T)) => void;
  subscribe: (l: () => void) => () => void;
}

export function createStore<T>(initial: T, persistKey?: string): Store<T> {
  let state = initial;
  if (persistKey) {
    try {
      const raw = localStorage.getItem(persistKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        state =
          initial && typeof initial === 'object' && !Array.isArray(initial) ? { ...initial, ...parsed } : parsed;
      }
    } catch {
      /* ignore */
    }
  }
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(v) {
      state = typeof v === 'function' ? (v as (p: T) => T)(state) : v;
      if (persistKey) {
        try {
          localStorage.setItem(persistKey, JSON.stringify(state));
        } catch {
          /* ignore */
        }
      }
      listeners.forEach((l) => l());
    },
    subscribe(l) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get);
}
