import { paper, person } from '../test/works';
import { buildGraph, yearSpan, type GraphOptions } from './graph';

const OPTIONS: GraphOptions = { years: [1900, 2100], maxAuthorsPerPaper: 12, maxNodes: 100 };
const none = new Set<string>();

const link = (g: ReturnType<typeof buildGraph>, a: string, b: string) =>
  g.links.find((l) => (l.source === a && l.target === b) || (l.source === b && l.target === a));
const node = (g: ReturnType<typeof buildGraph>, id: string) => g.nodes.find((n) => n.id === id);

describe('buildGraph', () => {
  it('makes a node for each person and a link for each pair on a paper', () => {
    const g = buildGraph([paper('w1', 2020, ['a', 'b', 'c'])], none, OPTIONS);

    expect(g.nodes.map((n) => n.id).sort()).toEqual(['a', 'b', 'c']);
    expect(g.links).toHaveLength(3);
    expect(link(g, 'a', 'c')).toMatchObject({ papers: 1 });
  });

  it('counts the papers two people share, and each person’s own papers', () => {
    const g = buildGraph(
      [paper('w1', 2020, ['a', 'b']), paper('w2', 2021, ['a', 'b']), paper('w3', 2022, ['a', 'c'])],
      none,
      OPTIONS,
    );

    expect(link(g, 'a', 'b')!.papers).toBe(2);
    expect(link(g, 'a', 'c')!.papers).toBe(1);
    expect(node(g, 'a')!.papers).toBe(3);
    expect(node(g, 'b')!.papers).toBe(2);
  });

  it('counts a paper once even when the same work appears twice', () => {
    const w = paper('w1', 2020, ['a', 'b']);
    const g = buildGraph([w, w], none, OPTIONS);

    expect(link(g, 'a', 'b')!.papers).toBe(1);
    expect(node(g, 'a')!.papers).toBe(1);
  });

  it('counts a person once when they are credited twice on one paper', () => {
    const g = buildGraph([paper('w1', 2020, ['a', 'a', 'b'])], none, OPTIONS);

    expect(node(g, 'a')!.papers).toBe(1);
    expect(g.links).toHaveLength(1);
    expect(link(g, 'a', 'b')!.papers).toBe(1);
  });

  it('never links a person to themselves', () => {
    const g = buildGraph([paper('w1', 2020, ['a'])], none, OPTIONS);

    expect(g.links).toEqual([]);
    expect(g.nodes).toHaveLength(1);
  });

  describe('years', () => {
    const works = [paper('old', 2005, ['a', 'b']), paper('new', 2020, ['a', 'c'])];

    it('ignores papers outside the range', () => {
      const g = buildGraph(works, none, { ...OPTIONS, years: [2010, 2024] });

      expect(node(g, 'b')).toBeUndefined();
      expect(node(g, 'c')).toBeDefined();
    });

    it('includes both ends of the range', () => {
      const g = buildGraph(works, none, { ...OPTIONS, years: [2005, 2020] });

      expect(g.nodes).toHaveLength(3);
    });
  });

  describe('papers with many authors', () => {
    const big = paper(
      'big',
      2020,
      Array.from({ length: 13 }, (_, i) => `x${i}`),
    );

    it('skips papers over the limit and reports how many', () => {
      const g = buildGraph([big, paper('ok', 2020, ['a', 'b'])], none, OPTIONS);

      expect(g.skippedPapers).toBe(1);
      expect(g.nodes.map((n) => n.id).sort()).toEqual(['a', 'b']);
    });

    it('keeps a paper that is exactly at the limit', () => {
      const g = buildGraph([big], none, { ...OPTIONS, maxAuthorsPerPaper: 13 });

      expect(g.skippedPapers).toBe(0);
      expect(g.nodes).toHaveLength(13);
    });

    it('does not count a skipped paper twice when it is listed twice', () => {
      expect(buildGraph([big, big], none, OPTIONS).skippedPapers).toBe(1);
    });
  });

  describe('the node limit', () => {
    const works = [
      paper('w1', 2020, ['a', 'b', 'c']),
      paper('w2', 2020, ['a', 'b']),
      paper('w3', 2020, ['a', 'd']),
    ];

    it('drops the people with the fewest papers first and reports how many', () => {
      const g = buildGraph(works, none, { ...OPTIONS, maxNodes: 2 });

      expect(g.nodes.map((n) => n.id).sort()).toEqual(['a', 'b']);
      expect(g.hidden).toBe(2);
    });

    it('drops links that touch a person who was dropped', () => {
      const g = buildGraph(works, none, { ...OPTIONS, maxNodes: 2 });

      expect(g.links).toEqual([{ source: 'a', target: 'b', papers: 2 }]);
    });

    it('always keeps the people whose own works were loaded', () => {
      const g = buildGraph(works, new Set(['d']), { ...OPTIONS, maxNodes: 2 });

      expect(node(g, 'd')).toBeDefined();
      expect(node(g, 'd')!.loaded).toBe(true);
      expect(node(g, 'a')).toBeDefined();
    });

    it('breaks ties by id so the result is the same every time', () => {
      const tied = [paper('w1', 2020, ['q', 'p', 'r'])];
      const g = buildGraph(tied, none, { ...OPTIONS, maxNodes: 2 });

      expect(g.nodes.map((n) => n.id)).toEqual(['p', 'q']);
    });
  });

  describe('countries and identifiers', () => {
    it('uses the country a person is most often credited in', () => {
      const g = buildGraph(
        [
          paper('w1', 2020, [person('a', ['GB'])]),
          paper('w2', 2020, [person('a', ['US'])]),
          paper('w3', 2020, [person('a', ['US'])]),
        ],
        none,
        OPTIONS,
      );

      expect(node(g, 'a')!.country).toBe('US');
    });

    it('breaks a tie between countries alphabetically', () => {
      const g = buildGraph(
        [paper('w1', 2020, [person('a', ['US'])]), paper('w2', 2020, [person('a', ['GB'])])],
        none,
        OPTIONS,
      );

      expect(node(g, 'a')!.country).toBe('GB');
    });

    it('has no country when none is given', () => {
      expect(node(buildGraph([paper('w1', 2020, ['a'])], none, OPTIONS), 'a')!.country).toBeNull();
    });

    it('keeps an ORCID found on any paper', () => {
      const g = buildGraph(
        [paper('w1', 2020, [person('a')]), paper('w2', 2021, [person('a', [], 'https://orcid.org/0000')])],
        none,
        OPTIONS,
      );

      expect(node(g, 'a')!.orcid).toBe('https://orcid.org/0000');
    });
  });

  it('marks loaded authors', () => {
    const g = buildGraph([paper('w1', 2020, ['a', 'b'])], new Set(['a']), OPTIONS);

    expect(node(g, 'a')!.loaded).toBe(true);
    expect(node(g, 'b')!.loaded).toBe(false);
  });

  it('returns an empty graph for no papers', () => {
    expect(buildGraph([], none, OPTIONS)).toEqual({ nodes: [], links: [], hidden: 0, skippedPapers: 0 });
  });

  it('does not change the papers it is given', () => {
    const works = [paper('w1', 2020, ['a', 'b'])];
    const before = JSON.stringify(works);
    buildGraph(works, none, OPTIONS);
    expect(JSON.stringify(works)).toBe(before);
  });
});

describe('yearSpan', () => {
  it('gives the first and last year', () => {
    expect(yearSpan([paper('a', 2010, ['x']), paper('b', 1999, ['x']), paper('c', 2024, ['x'])])).toEqual([
      1999, 2024,
    ]);
  });

  it('is null when there are no papers', () => {
    expect(yearSpan([])).toBeNull();
  });
});
