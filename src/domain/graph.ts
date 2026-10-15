import type { Credit, Work } from './types';

export interface GraphOptions {
  /** Papers outside this inclusive range of years are ignored. */
  years: [number, number];
  /** Papers with more authors than this are ignored: a 3,000-author paper links everyone and says little. */
  maxAuthorsPerPaper: number;
  /** The most people to show; the least connected are dropped first. */
  maxNodes: number;
}

export interface GraphNode {
  id: string;
  name: string;
  orcid: string | null;
  /** The number of papers in the data and the year range that this person is on. */
  papers: number;
  /** The country this person is most often credited in, or null when unknown. */
  country: string | null;
  /** True for authors whose works were loaded, which are the ones that can be expanded from. */
  loaded: boolean;
}

export interface GraphLink {
  source: string;
  target: string;
  /** The number of papers the two people share. */
  papers: number;
}

export interface Graph {
  nodes: GraphNode[];
  links: GraphLink[];
  /** How many people were left out because of `maxNodes`. */
  hidden: number;
  /** How many papers were left out for having too many authors. */
  skippedPapers: number;
}

export const EMPTY_GRAPH: Graph = { nodes: [], links: [], hidden: 0, skippedPapers: 0 };

/** The first and last year in a set of works, or null when there are none. */
export function yearSpan(works: Iterable<Work>): [number, number] | null {
  let min = Infinity;
  let max = -Infinity;
  for (const w of works) {
    min = Math.min(min, w.year);
    max = Math.max(max, w.year);
  }
  return min === Infinity ? null : [min, max];
}

function linkKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function mostCommon(counts: Map<string, number>): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== null && key < best)) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Builds the co-authorship network from papers: one node per person, and a link between two people for the
 * papers they share. `loaded` is the set of authors whose own works were fetched; a paper is counted once even
 * if several loaded authors' lists contain it.
 */
export function buildGraph(works: Iterable<Work>, loaded: ReadonlySet<string>, options: GraphOptions): Graph {
  const [from, to] = options.years;
  const seen = new Set<string>();
  const people = new Map<
    string,
    { name: string; orcid: string | null; papers: number; countries: Map<string, number> }
  >();
  const pairs = new Map<string, GraphLink>();
  let skippedPapers = 0;

  for (const work of works) {
    if (seen.has(work.id) || work.year < from || work.year > to) continue;
    seen.add(work.id);
    if (work.authors.length > options.maxAuthorsPerPaper) {
      skippedPapers++;
      continue;
    }
    // the same person can be credited twice on one paper; count them once
    const unique = new Map<string, Credit>();
    for (const author of work.authors) if (!unique.has(author.id)) unique.set(author.id, author);
    const ids = [...unique.keys()];
    for (const [id, author] of unique) {
      let person = people.get(id);
      if (!person) {
        person = { name: author.name, orcid: author.orcid, papers: 0, countries: new Map<string, number>() };
        people.set(id, person);
      }
      person.orcid ??= author.orcid;
      person.papers++;
      for (const country of author.countries)
        person.countries.set(country, (person.countries.get(country) ?? 0) + 1);
    }
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = linkKey(ids[i]!, ids[j]!);
        const link = pairs.get(key);
        if (link) link.papers++;
        else pairs.set(key, { source: ids[i]!, target: ids[j]!, papers: 1 });
      }
    }
  }

  const ranked = [...people.entries()].sort((a, b) => {
    const loadedA = loaded.has(a[0]) ? 1 : 0;
    const loadedB = loaded.has(b[0]) ? 1 : 0;
    return loadedB - loadedA || b[1].papers - a[1].papers || a[0].localeCompare(b[0]);
  });
  const kept = new Set(ranked.slice(0, options.maxNodes).map(([id]) => id));

  const nodes: GraphNode[] = ranked
    .filter(([id]) => kept.has(id))
    .map(([id, p]) => ({
      id,
      name: p.name,
      orcid: p.orcid,
      papers: p.papers,
      country: mostCommon(p.countries),
      loaded: loaded.has(id),
    }));
  const links = [...pairs.values()].filter((l) => kept.has(l.source) && kept.has(l.target));

  return { nodes, links, hidden: ranked.length - kept.size, skippedPapers };
}
