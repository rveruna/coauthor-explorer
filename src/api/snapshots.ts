import { z } from 'zod';
import featured from '../data/featured.json';
import type { Work } from '../domain/types';

const credit = z.object({
  id: z.string().min(1),
  name: z.string(),
  orcid: z.string().nullable(),
  countries: z.array(z.string()),
});

const work = z.object({
  id: z.string().min(1),
  title: z.string(),
  year: z.number().int(),
  citations: z.number(),
  authors: z.array(credit),
});

export const snapshotSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  savedAt: z.string(),
  works: z.array(work),
});

export interface Snapshot {
  id: string;
  name: string;
  savedAt: string;
  works: Work[];
}

/** The researchers with a saved copy, for the starting suggestions. */
export const FEATURED: { id: string; name: string }[] = featured.people;

const loaders = import.meta.glob('../data/snapshots/*.json', { import: 'default' }) as Record<
  string,
  () => Promise<unknown>
>;

/** A saved copy of a researcher's most cited papers, or null when there is none. It is loaded only when needed. */
export async function loadSnapshot(id: string): Promise<Snapshot | null> {
  const load = loaders[`../data/snapshots/${id}.json`];
  if (!load) return null;
  const parsed = snapshotSchema.safeParse(await load());
  return parsed.success ? parsed.data : null;
}
