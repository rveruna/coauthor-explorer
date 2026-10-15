import { useQueries, useQuery } from '@tanstack/react-query';
import { fetchAuthor, fetchWorks, OpenAlexError, searchAuthors } from '../api/openalexClient';
import { loadSnapshot } from '../api/snapshots';
import type { Work } from '../domain/types';
import { useDebouncedValue } from './useDebouncedValue';

export interface WorksResult {
  works: Work[];
  /** Where the data came from: OpenAlex just now, or a copy saved in the app. */
  source: 'live' | 'snapshot';
  /** The date a saved copy was made. */
  savedAt?: string;
  name?: string;
}

const HOUR = 60 * 60 * 1000;

/**
 * The most cited papers of one researcher. If OpenAlex cannot be reached or its free limit has been used up, and
 * there is a saved copy of this researcher, that is used instead, and is marked as such so the page can say so.
 */
export async function loadWorks(id: string, signal?: AbortSignal): Promise<WorksResult> {
  try {
    return { works: await fetchWorks(id, signal), source: 'live' };
  } catch (error) {
    if (error instanceof OpenAlexError && (error.kind === 'rate-limited' || error.kind === 'network')) {
      const snapshot = await loadSnapshot(id);
      if (snapshot)
        return { works: snapshot.works, source: 'snapshot', savedAt: snapshot.savedAt, name: snapshot.name };
    }
    throw error;
  }
}

export interface NetworkState {
  /** Every paper loaded so far, across all the researchers asked for. */
  works: Work[];
  /** The researchers whose papers have loaded. */
  loaded: Set<string>;
  loading: string[];
  failed: { id: string; error: Error }[];
  usingSnapshot: boolean;
  savedAt: string | null;
  retry: (id: string) => void;
}

/** Loads the papers of each researcher asked for, one request each, cached for an hour. */
export function useNetwork(ids: string[]): NetworkState {
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['works', id],
      queryFn: ({ signal }: { signal: AbortSignal }) => loadWorks(id, signal),
      // saved copies are tried against the live service again as soon as asked
      staleTime: (query: { state: { data?: WorksResult } }) =>
        query.state.data?.source === 'snapshot' ? 0 : HOUR,
      gcTime: HOUR,
      retry: (count: number, error: Error) =>
        error instanceof OpenAlexError && error.kind === 'network' && count < 1,
    })),
  });

  const works: Work[] = [];
  const loaded = new Set<string>();
  const loading: string[] = [];
  const failed: { id: string; error: Error }[] = [];
  let usingSnapshot = false;
  let savedAt: string | null = null;

  queries.forEach((q, i) => {
    const id = ids[i]!;
    if (q.data) {
      loaded.add(id);
      works.push(...q.data.works);
      if (q.data.source === 'snapshot') {
        usingSnapshot = true;
        savedAt = q.data.savedAt ?? savedAt;
      }
    } else if (q.isError) failed.push({ id, error: q.error });
    else loading.push(id);
  });

  return {
    works,
    loaded,
    loading,
    failed,
    usingSnapshot,
    savedAt,
    retry: (id) => void queries[ids.indexOf(id)]?.refetch(),
  };
}

/** Researchers matching a search, once the person has stopped typing. */
export function useAuthorSearch(text: string) {
  const query = useDebouncedValue(text.trim(), 300);
  return useQuery({
    queryKey: ['search', query],
    queryFn: ({ signal }) => searchAuthors(query, signal),
    enabled: query.length >= 2,
    staleTime: HOUR,
    retry: false,
  });
}

/** A researcher's overall figures, for the details panel. Failing to load them is not important. */
export function useAuthor(id: string | null) {
  return useQuery({
    queryKey: ['author', id],
    queryFn: ({ signal }) => fetchAuthor(id!, signal),
    enabled: id !== null,
    staleTime: HOUR,
    retry: false,
  });
}
