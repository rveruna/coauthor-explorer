import type { z } from 'zod';
import {
  authorSchema,
  authorsResponseSchema,
  toAuthor,
  toAuthors,
  toWorks,
  worksResponseSchema,
} from '../domain/schema';
import type { AuthorSummary, Work } from '../domain/types';

const BASE_URL = 'https://api.openalex.org';
const AUTHOR_FIELDS = 'id,display_name,orcid,works_count,cited_by_count,last_known_institutions';
const WORK_FIELDS = 'id,display_name,publication_year,cited_by_count,authorships';

/** The most papers asked for per person. OpenAlex's page limit is 100, and this takes the most cited ones. */
export const WORKS_PER_AUTHOR = 100;

export type OpenAlexErrorKind = 'network' | 'rate-limited' | 'not-found' | 'http' | 'invalid';

/** A failure to get usable data, with a kind the interface can explain. */
export class OpenAlexError extends Error {
  readonly kind: OpenAlexErrorKind;
  readonly status?: number;

  constructor(kind: OpenAlexErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'OpenAlexError';
    this.kind = kind;
    this.status = status;
  }
}

export function authorSearchUrl(query: string): string {
  const params = new URLSearchParams({ search: query, 'per-page': '8', select: AUTHOR_FIELDS });
  return `${BASE_URL}/authors?${params}`;
}

export function authorUrl(id: string): string {
  return `${BASE_URL}/authors/${encodeURIComponent(id)}?${new URLSearchParams({ select: AUTHOR_FIELDS })}`;
}

export function worksUrl(authorId: string): string {
  const params = new URLSearchParams({
    filter: `authorships.author.id:${authorId}`,
    sort: 'cited_by_count:desc',
    'per-page': String(WORKS_PER_AUTHOR),
    select: WORK_FIELDS,
  });
  return `${BASE_URL}/works?${params}`;
}

async function getJson<S extends z.ZodType>(
  url: string,
  schema: S,
  signal?: AbortSignal,
): Promise<z.infer<S>> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new OpenAlexError('network', 'Could not reach OpenAlex.');
  }

  if (response.status === 429) {
    throw new OpenAlexError('rate-limited', 'OpenAlex’s free limit has been reached for now.', 429);
  }
  if (response.status === 404) throw new OpenAlexError('not-found', 'OpenAlex has no such record.', 404);
  if (!response.ok) {
    throw new OpenAlexError('http', `OpenAlex answered with status ${response.status}.`, response.status);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new OpenAlexError('invalid', 'OpenAlex sent a response that was not JSON.');
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new OpenAlexError('invalid', 'OpenAlex sent data in a shape this app does not recognise.');
  }
  return parsed.data;
}

export async function searchAuthors(query: string, signal?: AbortSignal): Promise<AuthorSummary[]> {
  return toAuthors(await getJson(authorSearchUrl(query), authorsResponseSchema, signal));
}

export async function fetchAuthor(id: string, signal?: AbortSignal): Promise<AuthorSummary> {
  return toAuthor(await getJson(authorUrl(id), authorSchema, signal));
}

export async function fetchWorks(authorId: string, signal?: AbortSignal): Promise<Work[]> {
  return toWorks(await getJson(worksUrl(authorId), worksResponseSchema, signal));
}
