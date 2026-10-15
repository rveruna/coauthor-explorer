import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import App from '../App';
import { server } from './server';

export interface FakePaper {
  id: string;
  title?: string;
  year: number;
  citations?: number;
  /** Author ids, or [id, country] pairs. */
  authors: (string | [string, string])[];
}

const url = (id: string) => `https://openalex.org/${id}`;

export function worksBody(papers: FakePaper[]) {
  return {
    results: papers.map((p) => ({
      id: url(p.id),
      display_name: p.title ?? `Paper ${p.id}`,
      publication_year: p.year,
      cited_by_count: p.citations ?? 0,
      authorships: p.authors.map((a) => {
        const [id, country] = typeof a === 'string' ? [a, undefined] : a;
        return {
          author: { id: url(id), display_name: `Person ${id}`, orcid: null },
          countries: country ? [country] : [],
        };
      }),
    })),
  };
}

/**
 * Pretends to be OpenAlex. `papers` maps an author id to that author's papers. Anything asked for that is not
 * listed answers like OpenAlex does for a person with no papers.
 */
export function serve(papers: Record<string, FakePaper[]>, options: { searchResults?: object[] } = {}) {
  server.use(
    http.get('https://api.openalex.org/works', ({ request }) => {
      const filter = new URL(request.url).searchParams.get('filter') ?? '';
      const id = filter.split(':')[1] ?? '';
      return HttpResponse.json(worksBody(papers[id] ?? []));
    }),
    http.get('https://api.openalex.org/authors/:id', ({ params }) =>
      HttpResponse.json({
        id: url(String(params.id)),
        display_name: `Person ${String(params.id)}`,
        works_count: 321,
        cited_by_count: 4567,
        last_known_institutions: [{ display_name: 'Test University' }],
      }),
    ),
    http.get('https://api.openalex.org/authors', () =>
      HttpResponse.json({ results: options.searchResults ?? [] }),
    ),
  );
}

export const SEED = 'A1000';

/** A small world: A1000 writes with A2000, A3000 and A4000, who also write with each other. */
export const WORLD: Record<string, FakePaper[]> = {
  [SEED]: [
    { id: 'W1', year: 2010, citations: 100, authors: [SEED, ['A2000', 'US'], ['A3000', 'GB']] },
    { id: 'W2', year: 2015, citations: 50, authors: [SEED, ['A2000', 'US'], 'A4000'] },
    { id: 'W3', year: 2020, citations: 10, authors: [SEED, ['A3000', 'GB'], 'A4000'] },
    { id: 'W4', year: 2022, citations: 5, authors: [SEED, ['A2000', 'US']] },
  ],
  A2000: [
    { id: 'W1', year: 2010, citations: 100, authors: [SEED, ['A2000', 'US'], ['A3000', 'GB']] },
    { id: 'W9', year: 2018, citations: 7, authors: [['A2000', 'US'], 'A5000', 'A6000'] },
  ],
};

export function renderApp(search = '') {
  window.history.replaceState(null, '', `/${search}`);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>,
    ),
  };
}
