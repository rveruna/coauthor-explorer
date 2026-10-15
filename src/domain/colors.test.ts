import { BACKGROUND, COUNTRY_PALETTE, LINK_COLOR, OTHER_COLOR, countryColors, countryName } from './colors';
import { contrastRatio } from './contrast';
import type { GraphNode } from './graph';

const node = (id: string, country: string | null): GraphNode => ({
  id,
  name: id,
  orcid: null,
  papers: 1,
  country,
  loaded: false,
});

describe('palette contrast on the dark background (WCAG graphics, 3:1)', () => {
  it.each([...COUNTRY_PALETTE, OTHER_COLOR])('%s is visible', (colour) => {
    expect(contrastRatio(colour, BACKGROUND)).toBeGreaterThanOrEqual(3);
  });

  it('links are visible but quieter than the people', () => {
    expect(contrastRatio(LINK_COLOR, BACKGROUND)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(LINK_COLOR, BACKGROUND)).toBeLessThan(contrastRatio(OTHER_COLOR, BACKGROUND));
  });

  it('every palette colour is distinct from the others', () => {
    expect(new Set(COUNTRY_PALETTE).size).toBe(COUNTRY_PALETTE.length);
  });
});

describe('countryColors', () => {
  it('gives the most common country the first colour', () => {
    const legend = countryColors([node('a', 'US'), node('b', 'US'), node('c', 'GB')]);

    expect(legend.map((l) => [l.country, l.people])).toEqual([
      ['US', 2],
      ['GB', 1],
    ]);
    expect(legend[0]!.color).toBe(COUNTRY_PALETTE[0]);
  });

  it('breaks ties alphabetically so colours do not change between renders', () => {
    const legend = countryColors([node('a', 'US'), node('b', 'GB')]);

    expect(legend.map((l) => l.country)).toEqual(['GB', 'US']);
  });

  it('groups people with no country, and countries past the palette, as Other', () => {
    const codes = ['AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'GG', 'HH', 'II'];
    const nodes = [...codes.map((c) => node(c, c)), node('x', null)];
    const legend = countryColors(nodes);

    expect(legend).toHaveLength(COUNTRY_PALETTE.length + 1);
    expect(legend.at(-1)).toEqual({ country: null, color: OTHER_COLOR, people: 3 });
  });

  it('has no Other entry when every person has a colour', () => {
    expect(countryColors([node('a', 'US')]).some((l) => l.country === null)).toBe(false);
  });

  it('is empty for no people', () => {
    expect(countryColors([])).toEqual([]);
  });
});

describe('countryName', () => {
  it('writes the country out in English', () => {
    expect(countryName('GB')).toBe('United Kingdom');
  });

  it('falls back to the code when it is not a country', () => {
    expect(countryName('not a code')).toBe('not a code');
  });
});
