import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import {
  authorSearchUrl,
  authorUrl,
  fetchAuthor,
  fetchWorks,
  OpenAlexError,
  searchAuthors,
  worksUrl,
} from './openalexClient';

const works = {
  results: [
    {
      id: 'https://openalex.org/W1',
      display_name: 'A paper',
      publication_year: 2020,
      cited_by_count: 3,
      authorships: [{ author: { id: 'https://openalex.org/A1', display_name: 'Ada' }, countries: ['GB'] }],
    },
  ],
};

describe('URLs', () => {
  it('searches authors, asking only for the fields used', () => {
    const url = new URL(authorSearchUrl('Ada Lovelace'));
    expect(url.pathname).toBe('/authors');
    expect(url.searchParams.get('search')).toBe('Ada Lovelace');
    expect(url.searchParams.get('per-page')).toBe('8');
    expect(url.searchParams.get('select')).toContain('last_known_institutions');
  });

  it('asks for an author’s most cited works first, up to the page limit', () => {
    const url = new URL(worksUrl('A123'));
    expect(url.searchParams.get('filter')).toBe('authorships.author.id:A123');
    expect(url.searchParams.get('sort')).toBe('cited_by_count:desc');
    expect(url.searchParams.get('per-page')).toBe('100');
  });

  it('escapes an author id in the path', () => {
    expect(authorUrl('A1/../x')).toContain('/authors/A1%2F..%2Fx?');
  });
});

describe('fetchWorks', () => {
  it('returns validated works', async () => {
    server.use(http.get('https://api.openalex.org/works', () => HttpResponse.json(works)));

    const result = await fetchWorks('A1');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'W1', year: 2020 });
  });

  it('sends the author it was asked about', async () => {
    let requested = '';
    server.use(
      http.get('https://api.openalex.org/works', ({ request }) => {
        requested = request.url;
        return HttpResponse.json(works);
      }),
    );

    await fetchWorks('A777');

    expect(decodeURIComponent(requested)).toContain('authorships.author.id:A777');
  });

  it.each([
    ['a rate limit', 429, 'rate-limited'],
    ['a missing record', 404, 'not-found'],
    ['a server error', 503, 'http'],
  ])('reports %s', async (_name, status, kind) => {
    server.use(http.get('https://api.openalex.org/works', () => HttpResponse.json({}, { status })));

    await expect(fetchWorks('A1')).rejects.toMatchObject({ kind, status });
  });

  it('reports a dropped connection as a network error', async () => {
    server.use(http.get('https://api.openalex.org/works', () => HttpResponse.error()));

    await expect(fetchWorks('A1')).rejects.toMatchObject({ kind: 'network' });
  });

  it('reports a body that is not JSON', async () => {
    server.use(http.get('https://api.openalex.org/works', () => new HttpResponse('<html>')));

    await expect(fetchWorks('A1')).rejects.toMatchObject({ kind: 'invalid' });
  });

  it('reports data in an unexpected shape', async () => {
    server.use(http.get('https://api.openalex.org/works', () => HttpResponse.json({ results: 'nope' })));

    const error = await fetchWorks('A1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(OpenAlexError);
    expect(error).toMatchObject({ kind: 'invalid' });
  });

  it('passes an abort through unchanged', async () => {
    server.use(http.get('https://api.openalex.org/works', () => HttpResponse.json(works)));
    const controller = new AbortController();
    controller.abort();

    await expect(fetchWorks('A1', controller.signal)).rejects.not.toBeInstanceOf(OpenAlexError);
  });
});

describe('searchAuthors and fetchAuthor', () => {
  it('returns matching authors', async () => {
    server.use(
      http.get('https://api.openalex.org/authors', () =>
        HttpResponse.json({
          results: [{ id: 'https://openalex.org/A1', display_name: 'Ada', works_count: 5 }],
        }),
      ),
    );

    expect(await searchAuthors('ada')).toEqual([
      { id: 'A1', name: 'Ada', orcid: null, worksCount: 5, citations: 0, institution: null },
    ]);
  });

  it('returns one author by id', async () => {
    server.use(
      http.get('https://api.openalex.org/authors/A1', () =>
        HttpResponse.json({ id: 'https://openalex.org/A1', display_name: 'Ada', works_count: 5 }),
      ),
    );

    expect(await fetchAuthor('A1')).toMatchObject({ id: 'A1', name: 'Ada' });
  });

  it('reports an unknown author', async () => {
    server.use(
      http.get('https://api.openalex.org/authors/A404', () => HttpResponse.json({}, { status: 404 })),
    );

    await expect(fetchAuthor('A404')).rejects.toMatchObject({ kind: 'not-found' });
  });
});
