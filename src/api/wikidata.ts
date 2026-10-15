import { z } from 'zod';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const ORCID = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
const FILE_PATH = 'http://commons.wikimedia.org/wiki/Special:FilePath/';

export interface Photo {
  /** A small version of the photo, from Wikimedia Commons. */
  url: string;
  /** The photo's page on Commons, which gives its author and licence. */
  pageUrl: string;
}

/** ORCID iDs from their URL form, keeping only those in the expected shape. */
export function orcidIds(orcids: (string | null)[]): string[] {
  const ids = orcids.map((o) => (o ? o.slice(o.lastIndexOf('/') + 1) : '')).filter((id) => ORCID.test(id));
  return [...new Set(ids)];
}

/** The query that finds the photo on Wikidata of each person with one of these ORCID iDs. */
export function photoQuery(ids: string[]): string {
  const values = ids.map((id) => `"${id}"`).join(' ');
  return `SELECT ?orcid ?image WHERE { VALUES ?orcid { ${values} } ?person wdt:P496 ?orcid. ?person wdt:P18 ?image. }`;
}

const response = z.object({
  results: z.object({
    bindings: z.array(
      z.object({ orcid: z.object({ value: z.string() }), image: z.object({ value: z.string() }) }),
    ),
  }),
});

/** Turns a Commons file address into a small picture and the page that credits it, or null if it is not one. */
export function toPhoto(imageUrl: string): Photo | null {
  if (!imageUrl.startsWith(FILE_PATH)) return null;
  const name = imageUrl.slice(FILE_PATH.length);
  if (!name) return null;
  return {
    url: `https://commons.wikimedia.org/wiki/Special:FilePath/${name}?width=160`,
    pageUrl: `https://commons.wikimedia.org/wiki/File:${name}`,
  };
}

/**
 * Finds photos for people by their ORCID iD, which is an exact match and not a guess from a name. Only people who
 * have a photo on Wikidata are returned, which is a small share of researchers. A failure is not important: those
 * people simply keep their initials.
 */
export async function fetchPhotos(orcids: string[], signal?: AbortSignal): Promise<Map<string, Photo>> {
  const photos = new Map<string, Photo>();
  const ids = orcidIds(orcids);
  if (ids.length === 0) return photos;

  const body = new URLSearchParams({ query: photoQuery(ids), format: 'json' });
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    body,
    headers: { Accept: 'application/sparql-results+json' },
    signal,
  });
  if (!res.ok) throw new Error(`Wikidata answered with status ${res.status}`);
  const parsed = response.safeParse(await res.json());
  if (!parsed.success) throw new Error('Wikidata sent data in an unexpected shape');

  for (const row of parsed.data.results.bindings) {
    const photo = toPhoto(row.image.value);
    if (photo && !photos.has(row.orcid.value)) photos.set(row.orcid.value, photo);
  }
  return photos;
}
