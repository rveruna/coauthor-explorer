import type { GraphNode } from './graph';

/** The page and canvas background. Every colour below is checked against it in colors.test.ts. */
export const BACKGROUND = '#0b1220';
export const OTHER_COLOR = '#9aa5b1';
export const LINK_COLOR = '#6b7c93';

/** Based on the Okabe-Ito colour-blind-safe palette, lightened for a dark background and extended; not simulated. */
export const COUNTRY_PALETTE = [
  '#56b4e9',
  '#e69f00',
  '#2fc79a',
  '#f0e442',
  '#e07bb0',
  '#ff8a4c',
  '#8fa4ff',
] as const;

export interface CountryColor {
  /** A country code, or null for the people grouped as "Other" or with no country. */
  country: string | null;
  color: string;
  people: number;
}

/** Gives the most common countries a colour each, and everything else a neutral grey. */
export function countryColors(nodes: GraphNode[]): CountryColor[] {
  const counts = new Map<string, number>();
  let unknown = 0;
  for (const node of nodes) {
    if (node.country) counts.set(node.country, (counts.get(node.country) ?? 0) + 1);
    else unknown++;
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const named: CountryColor[] = ranked
    .slice(0, COUNTRY_PALETTE.length)
    .map(([country, people], i) => ({ country, color: COUNTRY_PALETTE[i]!, people }));
  const others = ranked.slice(COUNTRY_PALETTE.length).reduce((sum, [, n]) => sum + n, 0) + unknown;
  return others > 0 ? [...named, { country: null, color: OTHER_COLOR, people: others }] : named;
}

const regionNames =
  typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;

/** "United Kingdom" for "GB", falling back to the code itself. */
export function countryName(code: string): string {
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}
