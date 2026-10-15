import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { fetchPhotos, orcidIds, photoQuery, toPhoto } from './wikidata';

const FILE = 'http://commons.wikimedia.org/wiki/Special:FilePath/Professor%20Jennifer%20Doudna.jpg';
const row = (orcid: string, image: string) => ({ orcid: { value: orcid }, image: { value: image } });
const answer = (...rows: ReturnType<typeof row>[]) => HttpResponse.json({ results: { bindings: rows } });

describe('orcidIds', () => {
  it('keeps the iD from an ORCID address, without repeats', () => {
    expect(
      orcidIds([
        'https://orcid.org/0000-0001-9161-999X',
        'https://orcid.org/0000-0001-9161-999X',
        '0000-0002-1825-0097',
      ]),
    ).toEqual(['0000-0001-9161-999X', '0000-0002-1825-0097']);
  });

  it.each([
    null,
    '',
    'https://orcid.org/not-an-id',
    'https://orcid.org/0000-0001-9161-99',
    '0000-0001-9161-999X" } UNION { ?s ?p ?o',
  ])('drops %s', (value) => {
    expect(orcidIds([value])).toEqual([]);
  });
});

describe('photoQuery', () => {
  it('asks for the photo of each person, matched by ORCID iD', () => {
    const query = photoQuery(['0000-0001-9161-999X', '0000-0002-1825-0097']);

    expect(query).toContain('VALUES ?orcid { "0000-0001-9161-999X" "0000-0002-1825-0097" }');
    expect(query).toContain('wdt:P496 ?orcid');
    expect(query).toContain('wdt:P18 ?image');
  });
});

describe('toPhoto', () => {
  it('gives a small picture and the page that credits it', () => {
    expect(toPhoto(FILE)).toEqual({
      url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Professor%20Jennifer%20Doudna.jpg?width=160',
      pageUrl: 'https://commons.wikimedia.org/wiki/File:Professor%20Jennifer%20Doudna.jpg',
    });
  });

  it.each([
    'https://evil.example/pic.jpg',
    'https://evil.example/a/path/that/is/longer/than/the/commons/prefix/pic.jpg',
    'http://commons.wikimedia.org/wiki/Special:FilePath/',
    '',
  ])('refuses %s', (value) => {
    expect(toPhoto(value)).toBeNull();
  });
});

describe('fetchPhotos', () => {
  it('returns the photos of the people who have one, by ORCID iD', async () => {
    server.use(
      http.post('https://query.wikidata.org/sparql', () => answer(row('0000-0001-9161-999X', FILE))),
    );

    const photos = await fetchPhotos([
      'https://orcid.org/0000-0001-9161-999X',
      'https://orcid.org/0000-0002-1825-0097',
    ]);

    expect([...photos.keys()]).toEqual(['0000-0001-9161-999X']);
  });

  it('sends the query by POST so a long list is not a problem', async () => {
    let sent = '';
    server.use(
      http.post('https://query.wikidata.org/sparql', async ({ request }) => {
        sent = await request.text();
        return answer();
      }),
    );

    await fetchPhotos(['0000-0001-9161-999X']);

    expect(decodeURIComponent(sent.replace(/\+/g, ' '))).toContain('"0000-0001-9161-999X"');
  });

  it('makes no request when nobody has a usable ORCID iD', async () => {
    await expect(fetchPhotos([])).resolves.toEqual(new Map());
    await expect(fetchPhotos(['nonsense'])).resolves.toEqual(new Map());
  });

  it('keeps the first photo when a person has several, and skips ones that are not Commons files', async () => {
    server.use(
      http.post('https://query.wikidata.org/sparql', () =>
        answer(
          row('0000-0001-9161-999X', FILE),
          row('0000-0001-9161-999X', 'http://commons.wikimedia.org/wiki/Special:FilePath/Other.jpg'),
          row('0000-0002-1825-0097', 'https://x.example/a.jpg'),
        ),
      ),
    );

    const photos = await fetchPhotos(['0000-0001-9161-999X', '0000-0002-1825-0097']);

    expect(photos.size).toBe(1);
    expect(photos.get('0000-0001-9161-999X')!.url).toContain('Doudna');
  });

  it('fails on a bad status or an unexpected shape, which the caller treats as no photos', async () => {
    server.use(http.post('https://query.wikidata.org/sparql', () => HttpResponse.json({}, { status: 500 })));
    await expect(fetchPhotos(['0000-0001-9161-999X'])).rejects.toThrow(/status 500/);

    server.use(http.post('https://query.wikidata.org/sparql', () => HttpResponse.json({ nope: 1 })));
    await expect(fetchPhotos(['0000-0001-9161-999X'])).rejects.toThrow(/unexpected shape/);
  });
});
