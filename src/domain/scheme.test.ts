import { COUNTRY_PALETTE, OTHER_COLOR } from './colors';
import { findGroups } from './communities';
import { buildGraph } from './graph';
import { colorScheme, GROUP_RING_RADIUS } from './scheme';
import { paper, person } from '../test/works';

const OPTIONS = { years: [1900, 2100] as [number, number], maxAuthorsPerPaper: 12, maxNodes: 100 };

const works = [
  paper('w1', 2020, [person('hub', ['US']), person('a1', ['US']), person('a2', ['US'])]),
  paper('w2', 2020, [person('hub', ['US']), person('a1', ['US']), person('a2', ['US'])]),
  paper('w3', 2020, [person('hub', ['US']), person('b1', ['GB']), person('b2', ['GB'])]),
  paper('w4', 2020, [person('hub', ['US']), person('b1', ['GB']), person('b2', ['GB'])]),
  paper('w5', 2020, [person('hub', ['US']), person('solo', [])]),
];
const graph = buildGraph(works, new Set(['hub']), OPTIONS);
const groups = findGroups(graph);
const node = (id: string) => graph.nodes.find((n) => n.id === id)!;

describe('colouring by country', () => {
  const scheme = colorScheme('country', graph, groups);

  it('gives each common country a colour and everything else the neutral one', () => {
    expect(scheme.colorOf(node('a1'))).toBe(COUNTRY_PALETTE[0]);
    expect(scheme.colorOf(node('b1'))).toBe(COUNTRY_PALETTE[1]);
    expect(scheme.colorOf(node('solo'))).toBe(OTHER_COLOR);
  });

  it('describes people in words by country', () => {
    expect(scheme.noun).toBe('Country');
    expect(scheme.labelOf(node('a1'))).toBe('United States');
    expect(scheme.labelOf(node('solo'))).toBeNull();
  });

  it('has a legend that counts the people', () => {
    expect(scheme.legend.map((l) => [l.label, l.people])).toEqual([
      ['United States', 3],
      ['United Kingdom', 2],
      ['Other or unknown', 1],
    ]);
  });
});

describe('colouring by group', () => {
  const scheme = colorScheme('group', graph, groups);

  it('gives each circle of collaborators its own colour', () => {
    expect(scheme.colorOf(node('a1'))).toBe(scheme.colorOf(node('a2')));
    expect(scheme.colorOf(node('b1'))).toBe(scheme.colorOf(node('b2')));
    expect(scheme.colorOf(node('a1'))).not.toBe(scheme.colorOf(node('b1')));
  });

  it('shares the neutral colour between people who are not in a group of two or more', () => {
    expect(scheme.colorOf(node('solo'))).toBe(OTHER_COLOR);
    expect(scheme.labelOf(node('solo'))).toBeNull();
  });

  it('names each group after its most published member', () => {
    expect(scheme.noun).toBe('Group');
    expect(scheme.labelOf(node('a1'))).toMatch(/^Around Person a[12]$/);
  });

  it('has a legend whose counts add up to everyone, with the neutral group last', () => {
    expect(scheme.legend.reduce((sum, l) => sum + l.people, 0)).toBe(graph.nodes.length);
    expect(scheme.legend.at(-1)).toMatchObject({ color: OTHER_COLOR, people: 1 });
  });

  it('has no neutral entry when every group has two or more people', () => {
    const together = buildGraph([paper('w1', 2020, ['a', 'b'])], new Set(), OPTIONS);
    const scheme2 = colorScheme('group', together, findGroups(together));
    expect(scheme2.legend.some((l) => l.color === OTHER_COLOR)).toBe(false);
  });

  it('never needs more colours than the palette has', () => {
    const many = Array.from({ length: 20 }, (_, i) => paper(`w${i}`, 2020, [`p${i}a`, `p${i}b`]));
    const g = buildGraph(many, new Set(), OPTIONS);
    const s = colorScheme('group', g, findGroups(g));

    expect(s.legend.filter((l) => l.color !== OTHER_COLOR)).toHaveLength(COUNTRY_PALETTE.length);
    expect(s.legend.at(-1)!.color).toBe(OTHER_COLOR);
  });
});

describe('group anchors', () => {
  it('are not used when colouring by country', () => {
    expect(colorScheme('country', graph, groups).anchors).toBeNull();
  });

  it('give each member of a group the same place, and different groups different places', () => {
    const { anchors } = colorScheme('group', graph, groups);

    expect(anchors!.get('a1')).toEqual(anchors!.get('a2'));
    expect(anchors!.get('b1')).toEqual(anchors!.get('b2'));
    expect(anchors!.get('a1')).not.toEqual(anchors!.get('b1'));
  });

  it('put the groups on a ring round the middle', () => {
    const { anchors } = colorScheme('group', graph, groups);

    for (const id of ['a1', 'b1']) {
      const { x, y } = anchors!.get(id)!;
      expect(Math.hypot(x, y)).toBeCloseTo(GROUP_RING_RADIUS);
    }
  });

  it('leave the people whose own papers were loaded free, and people with no group of their own', () => {
    const { anchors } = colorScheme('group', graph, groups);

    expect(anchors!.has('hub')).toBe(false);
    expect(anchors!.has('solo')).toBe(false);
  });
});
