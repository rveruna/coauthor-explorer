import { z } from 'zod';
import type { AuthorSummary, Work } from './types';

const shortId = (url: string) => url.slice(url.lastIndexOf('/') + 1);
const orcidOrNull = z
  .string()
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const authorship = z.object({
  author: z.object({
    // OpenAlex has credits with no author record, so the id can be missing; those cannot be linked to anyone
    id: z.string().min(1).nullable().optional(),
    display_name: z.string().nullable().optional(),
    orcid: orcidOrNull,
  }),
  countries: z.array(z.string()).optional().default([]),
});

const work = z.object({
  id: z.string().min(1),
  display_name: z.string().nullable().optional(),
  publication_year: z.number().int().nullable().optional(),
  cited_by_count: z.number().optional().default(0),
  authorships: z.array(authorship),
});

export const worksResponseSchema = z.object({ results: z.array(work) });

const authorResult = z.object({
  id: z.string().min(1),
  display_name: z.string().nullable().optional(),
  orcid: orcidOrNull,
  works_count: z.number().optional().default(0),
  cited_by_count: z.number().optional().default(0),
  last_known_institutions: z
    .array(z.object({ display_name: z.string() }))
    .nullable()
    .optional(),
});

export const authorSchema = authorResult;
export const authorsResponseSchema = z.object({ results: z.array(authorResult) });

/**
 * Keeps papers with a year and at least one identified author, and shortens OpenAlex ids. Credits with no author
 * record are left out.
 */
export function toWorks(response: z.infer<typeof worksResponseSchema>): Work[] {
  const works: Work[] = [];
  for (const w of response.results) {
    if (w.publication_year == null) continue;
    const authors = w.authorships.flatMap((a) =>
      a.author.id
        ? [
            {
              id: shortId(a.author.id),
              name: a.author.display_name?.trim() || 'Unknown author',
              orcid: a.author.orcid,
              countries: a.countries,
            },
          ]
        : [],
    );
    if (authors.length === 0) continue;
    works.push({
      id: shortId(w.id),
      title: w.display_name?.trim() || 'Untitled',
      year: w.publication_year,
      citations: w.cited_by_count,
      authors,
    });
  }
  return works;
}

export function toAuthor(a: z.infer<typeof authorSchema>): AuthorSummary {
  return {
    id: shortId(a.id),
    name: a.display_name?.trim() || 'Unknown author',
    orcid: a.orcid,
    worksCount: a.works_count,
    citations: a.cited_by_count,
    institution: a.last_known_institutions?.[0]?.display_name ?? null,
  };
}

export function toAuthors(response: z.infer<typeof authorsResponseSchema>): AuthorSummary[] {
  return response.results.map(toAuthor);
}
