import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { GraphNode } from '../domain/graph';
import { useAvatars } from './useAvatars';

const node = (id: string): GraphNode => ({
  id,
  name: `Person ${id}`,
  orcid: null,
  papers: 1,
  country: null,
  loaded: false,
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useAvatars', () => {
  it('gives an avatar to each person who has no photo, once the maker has loaded', async () => {
    const nodes = [node('A1'), node('A2'), node('A3')];
    const { result } = renderHook(() => useAvatars(nodes, (id) => id === 'A2'), { wrapper });

    expect(result.current.size).toBe(0);
    await waitFor(() => expect(result.current.size).toBe(2));
    expect([...result.current.keys()].sort()).toEqual(['A1', 'A3']);
    expect(result.current.get('A1')).toMatch(/^data:image\/svg\+xml/);
  });

  it('gives the same avatar to the same person on every render', async () => {
    const nodes = [node('A1')];
    const { result, rerender } = renderHook(() => useAvatars(nodes, () => false), { wrapper });
    await waitFor(() => expect(result.current.size).toBe(1));
    const first = result.current.get('A1');

    rerender();

    expect(result.current.get('A1')).toBe(first);
  });

  it('makes none when everyone has a photo', async () => {
    const { result } = renderHook(() => useAvatars([node('A1')], () => true), { wrapper });
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.size).toBe(0);
  });
});
