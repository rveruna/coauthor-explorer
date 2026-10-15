import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(listener: () => void): () => void {
  const media = window.matchMedia?.(QUERY);
  media?.addEventListener('change', listener);
  return () => media?.removeEventListener('change', listener);
}

/** Whether the person has asked their system to reduce motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(QUERY).matches ?? false,
    () => false,
  );
}
