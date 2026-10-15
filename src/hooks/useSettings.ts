import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { parseSettings, settingsToSearch, type Settings } from '../domain/settings';

const CHANGE_EVENT = 'coauthor-settings-change';

function subscribe(listener: () => void): () => void {
  window.addEventListener('popstate', listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

const getSearch = () => window.location.search;

/**
 * The user's choices, kept in the URL query string so a link reproduces the view. This is separate from the
 * server data, which TanStack Query holds. Changes replace the history entry for small tweaks, and push a new one
 * when the starting researcher changes so the back button goes back to the last search.
 */
export function useSettings(): [Settings, (patch: Partial<Settings>, options?: { push?: boolean }) => void] {
  const search = useSyncExternalStore(subscribe, getSearch);
  const settings = useMemo(() => parseSettings(search), [search]);

  const update = useCallback((patch: Partial<Settings>, options?: { push?: boolean }) => {
    const next = { ...parseSettings(window.location.search), ...patch };
    const url = `${window.location.pathname}${settingsToSearch(next)}${window.location.hash}`;
    if (options?.push) window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [settings, update];
}
