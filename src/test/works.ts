import type { Credit, Work } from '../domain/types';

export const person = (id: string, countries: string[] = [], orcid: string | null = null): Credit => ({
  id,
  name: `Person ${id}`,
  orcid,
  countries,
});

/** A paper with the given authors, each as an id or a ready-made credit. */
export function paper(id: string, year: number, authors: (string | Credit)[], citations = 0): Work {
  return {
    id,
    title: `Paper ${id}`,
    year,
    citations,
    authors: authors.map((a) => (typeof a === 'string' ? person(a) : a)),
  };
}
