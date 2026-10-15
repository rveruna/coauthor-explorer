// Saves a copy of real OpenAlex data for a few well-known researchers, so the app still has something to show
// when OpenAlex cannot be reached or its free daily limit has run out. Only bibliographic facts are kept: names,
// paper titles, years, citation counts and who was credited. See the README for the note on OpenAlex's terms.
// Usage: node scripts/snapshot.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const SEEDS = [
  ['A5108093963', 'Geoffrey Hinton'],
  ['A5086198262', 'Yoshua Bengio'],
  ['A5100450462', 'Fei-Fei Li'],
  ['A5067184382', 'Jennifer Doudna'],
  ['A5005349213', 'Demis Hassabis'],
  ['A5030598859', 'Katalin Karikó'],
  ['A5025908133', 'Tim Berners-Lee'],
];
// Papers with more authors than this are left out, which keeps the files small. The app's own limit is 50.
const MAX_AUTHORS = 50;
const short = (url) => url.slice(url.lastIndexOf('/') + 1);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return response.json();
}

mkdirSync(new URL('../src/data/snapshots/', import.meta.url), { recursive: true });
const savedAt = new Date().toISOString().slice(0, 10);
const featured = [];

for (const [id, label] of SEEDS) {
  const author = await get(`https://api.openalex.org/authors/${id}?select=id,display_name`);
  await wait(250);
  const params = new URLSearchParams({
    filter: `authorships.author.id:${id}`,
    sort: 'cited_by_count:desc',
    'per-page': '100',
    select: 'id,display_name,publication_year,cited_by_count,authorships',
  });
  const body = await get(`https://api.openalex.org/works?${params}`);
  const works = body.results
    .filter((w) => w.publication_year != null && w.authorships.length <= MAX_AUTHORS)
    .map((w) => ({
      id: short(w.id),
      title: (w.display_name ?? 'Untitled').trim() || 'Untitled',
      year: w.publication_year,
      citations: w.cited_by_count ?? 0,
      // credits with no author record cannot be linked to anyone, so they are left out
      authors: w.authorships
        .filter((a) => a.author?.id)
        .map((a) => ({
          id: short(a.author.id),
          name: (a.author.display_name ?? 'Unknown author').trim() || 'Unknown author',
          orcid: a.author.orcid ?? null,
          countries: a.countries ?? [],
        })),
    }))
    .filter((w) => w.authors.length > 0);
  writeFileSync(
    new URL(`../src/data/snapshots/${id}.json`, import.meta.url),
    JSON.stringify({ id, name: author.display_name ?? label, savedAt, works }),
  );
  featured.push({ id, name: author.display_name ?? label });
  console.log(`${id} ${author.display_name}: ${works.length} papers`);
  await wait(250);
}

writeFileSync(
  new URL('../src/data/featured.json', import.meta.url),
  JSON.stringify({ savedAt, people: featured }, null, 2) + '\n',
);
