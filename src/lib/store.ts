import { useSyncExternalStore } from "react";

// Minimal shared state for values several screens need (e.g. the selected pet).
export function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();

  const get = () => value;
  const set = (next: T) => {
    value = next;
    listeners.forEach((l) => l());
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const useValue = () => useSyncExternalStore(subscribe, get, get);

  return { get, set, useValue };
}

/** Pet currently shown on Home and Log. null means "first pet". */
export const selectedPetStore = createStore<string | null>(null);

/** Bumped after a write so screens reload their data. */
export const dataVersionStore = createStore(0);
