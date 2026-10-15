import type { Work } from './types';

/** The papers two people are both credited on, most cited first. */
export function sharedWorks(works: Iterable<Work>, a: string, b: string): Work[] {
  const seen = new Set<string>();
  const shared: Work[] = [];
  for (const work of works) {
    if (seen.has(work.id)) continue;
    seen.add(work.id);
    const ids = new Set(work.authors.map((x) => x.id));
    if (ids.has(a) && ids.has(b)) shared.push(work);
  }
  return shared.sort((x, y) => y.citations - x.citations || y.year - x.year || x.id.localeCompare(y.id));
}

export const openAlexAuthorUrl = (id: string) => `https://openalex.org/authors/${id}`;
export const openAlexWorkUrl = (id: string) => `https://openalex.org/works/${id}`;
