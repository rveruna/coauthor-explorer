import { http, HttpResponse } from 'msw';
import { FEATURED } from '../api/snapshots';
import { server } from '../test/server';
import { loadWorks } from './useNetwork';

const WORKS = 'https://api.openalex.org/works';
const FEATURED_ID = FEATURED[0]!.id;
const body = {
  results: [
    {
      id: 'https://openalex.org/W1',
      display_name: 'Live paper',
      publication_year: 2020,
      authorships: [{ author: { id: 'https://openalex.org/A1', display_name: 'Ada' } }],
    },
  ],
};

describe('loadWorks', () => {
  it('uses OpenAlex when it answers', async () => {
    server.use(http.get(WORKS, () => HttpResponse.json(body)));

    const result = await loadWorks(FEATURED_ID);

    expect(result.source).toBe('live');
    expect(result.works.map((w) => w.title)).toEqual(['Live paper']);
  });

  it.each([
    ['the free limit has been reached', () => HttpResponse.json({}, { status: 429 })],
    ['OpenAlex cannot be reached', () => HttpResponse.error()],
  ])('uses the saved copy of a featured researcher when %s', async (_name, handler) => {
    server.use(http.get(WORKS, handler));

    const result = await loadWorks(FEATURED_ID);

    expect(result.source).toBe('snapshot');
    expect(result.savedAt).toMatch(/^\d{4}-/);
    expect(result.works.length).toBeGreaterThan(30);
  });

  it('fails when the limit is reached and there is no saved copy', async () => {
    server.use(http.get(WORKS, () => HttpResponse.json({}, { status: 429 })));

    await expect(loadWorks('A1')).rejects.toMatchObject({ kind: 'rate-limited' });
  });

  it.each([
    ['an unknown record', () => HttpResponse.json({}, { status: 404 }), 'not-found'],
    ['a server error', () => HttpResponse.json({}, { status: 500 }), 'http'],
    ['an unreadable response', () => HttpResponse.json({ results: 5 }), 'invalid'],
  ])('does not hide %s behind a saved copy', async (_name, handler, kind) => {
    server.use(http.get(WORKS, handler));

    await expect(loadWorks(FEATURED_ID)).rejects.toMatchObject({ kind });
  });
});
