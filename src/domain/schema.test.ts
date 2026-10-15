import { authorsResponseSchema, toAuthors, toWorks, worksResponseSchema } from './schema';

const authorship = (id: string, name: string | null, countries?: string[], orcid?: string | null) => ({
  author: { id: `https://openalex.org/${id}`, display_name: name, orcid },
  countries,
});

describe('toWorks', () => {
  it('shortens ids and reads authors, countries and citations', () => {
    const parsed = worksResponseSchema.parse({
      results: [
        {
          id: 'https://openalex.org/W1',
          display_name: ' A paper ',
          publication_year: 2020,
          cited_by_count: 12,
          authorships: [
            authorship('A1', 'Ada', ['GB'], 'https://orcid.org/0000-0001'),
            authorship('A2', 'Bo'),
          ],
        },
      ],
    });

    expect(toWorks(parsed)).toEqual([
      {
        id: 'W1',
        title: 'A paper',
        year: 2020,
        citations: 12,
        authors: [
          { id: 'A1', name: 'Ada', orcid: 'https://orcid.org/0000-0001', countries: ['GB'] },
          { id: 'A2', name: 'Bo', orcid: null, countries: [] },
        ],
      },
    ]);
  });

  it('falls back for missing names and titles and a missing citation count', () => {
    const parsed = worksResponseSchema.parse({
      results: [
        { id: 'W1', display_name: null, publication_year: 2020, authorships: [authorship('A1', null)] },
      ],
    });
    const [work] = toWorks(parsed);

    expect(work).toMatchObject({ title: 'Untitled', citations: 0 });
    expect(work!.authors[0]!.name).toBe('Unknown author');
  });

  it('leaves out credits that have no author record, as real OpenAlex data does', () => {
    const parsed = worksResponseSchema.parse({
      results: [
        {
          id: 'W1',
          publication_year: 2020,
          authorships: [
            authorship('A1', 'Ada'),
            { author: { id: null, display_name: 'Someone unlinked' }, countries: ['US'] },
            { author: { display_name: 'No id at all' } },
          ],
        },
      ],
    });

    expect(toWorks(parsed)[0]!.authors.map((a) => a.id)).toEqual(['A1']);
  });

  it('drops a paper whose credits are all unlinked', () => {
    const parsed = worksResponseSchema.parse({
      results: [{ id: 'W1', publication_year: 2020, authorships: [{ author: { id: null } }] }],
    });

    expect(toWorks(parsed)).toEqual([]);
  });

  it('drops papers with no year or no authors', () => {
    const parsed = worksResponseSchema.parse({
      results: [
        { id: 'W1', publication_year: null, authorships: [authorship('A1', 'Ada')] },
        { id: 'W2', publication_year: 2020, authorships: [] },
        { id: 'W3', publication_year: 2020, authorships: [authorship('A1', 'Ada')] },
      ],
    });

    expect(toWorks(parsed).map((w) => w.id)).toEqual(['W3']);
  });

  it.each([
    ['no results list', {}],
    ['an author record that is missing', { results: [{ id: 'W1', authorships: [{}] }] }],
    ['a year that is a string', { results: [{ id: 'W1', publication_year: '2020', authorships: [] }] }],
    ['an empty paper id', { results: [{ id: '', authorships: [] }] }],
  ])('rejects %s', (_name, body) => {
    expect(worksResponseSchema.safeParse(body).success).toBe(false);
  });
});

describe('toAuthors', () => {
  it('reads a search result', () => {
    const parsed = authorsResponseSchema.parse({
      results: [
        {
          id: 'https://openalex.org/A9',
          display_name: 'Grace',
          orcid: null,
          works_count: 40,
          cited_by_count: 900,
          last_known_institutions: [{ display_name: 'Yale' }, { display_name: 'Other' }],
        },
      ],
    });

    expect(toAuthors(parsed)).toEqual([
      { id: 'A9', name: 'Grace', orcid: null, worksCount: 40, citations: 900, institution: 'Yale' },
    ]);
  });

  it('copes with no institution and missing counts', () => {
    const parsed = authorsResponseSchema.parse({
      results: [{ id: 'A9', display_name: null, last_known_institutions: null }],
    });

    expect(toAuthors(parsed)[0]).toMatchObject({
      name: 'Unknown author',
      institution: null,
      worksCount: 0,
      citations: 0,
    });
  });
});
