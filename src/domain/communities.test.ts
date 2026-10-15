import { buildGraph, type Graph } from './graph';
import { findGroups } from './communities';
import { paper } from '../test/works';

const OPTIONS = { years: [1900, 2100] as [number, number], maxAuthorsPerPaper: 12, maxNodes: 100 };
const graphOf = (works: ReturnType<typeof paper>[], loaded: string[] = []): Graph =>
  buildGraph(works, new Set(loaded), OPTIONS);

/** Two tight circles joined by a single paper, with a hub who is in both. */
const TWO_CIRCLES = [
  ...['1', '2', '3'].map((n) => paper(`x${n}`, 2020, ['a1', 'a2', 'a3', 'hub'])),
  ...['1', '2', '3'].map((n) => paper(`y${n}`, 2020, ['b1', 'b2', 'b3', 'hub'])),
  paper('bridge', 2020, ['a1', 'b1']),
];

describe('findGroups', () => {
  it('separates circles of people who write together, even when the hub links them', () => {
    const groups = findGroups(graphOf(TWO_CIRCLES, ['hub']));

    expect(groups.of.get('a1')).toBe(groups.of.get('a2'));
    expect(groups.of.get('a2')).toBe(groups.of.get('a3'));
    expect(groups.of.get('b1')).toBe(groups.of.get('b2'));
    expect(groups.of.get('a1')).not.toBe(groups.of.get('b1'));
  });

  it('puts the hub in the group it shares the most papers with', () => {
    const works = [...TWO_CIRCLES, paper('extra', 2021, ['b1', 'b2', 'hub'])];
    const groups = findGroups(graphOf(works, ['hub']));

    expect(groups.of.get('hub')).toBe(groups.of.get('b1'));
  });

  it('numbers groups from the biggest', () => {
    const works = [...TWO_CIRCLES, paper('b4', 2020, ['b1', 'b4']), paper('b5', 2020, ['b2', 'b5'])];
    const groups = findGroups(graphOf(works, ['hub']));

    expect(groups.sizes[0]!).toBeGreaterThanOrEqual(groups.sizes[1]!);
    expect(groups.of.get('b1')).toBe(0);
    expect(groups.sizes.reduce((a, b) => a + b, 0)).toBe(groups.of.size - 1);
  });

  it('names the person with the most papers as the leader of each group', () => {
    const works = [...TWO_CIRCLES, paper('more1', 2022, ['a2', 'a3']), paper('more2', 2023, ['a2', 'a3'])];
    const groups = findGroups(graphOf(works, ['hub']));

    const aGroup = groups.of.get('a1')!;
    // a2 and a3 are on five papers and a1 on four; a2 wins the tie by id
    expect(groups.leaders[aGroup]).toBe('a2');
  });

  it('gives people with no links to anyone a group of their own', () => {
    const groups = findGroups(graphOf([paper('w1', 2020, ['a', 'b']), paper('w2', 2020, ['c'])]));

    expect(groups.of.get('c')).not.toBe(groups.of.get('a'));
    expect(groups.sizes).toContain(1);
  });

  it('gives the same answer every time', () => {
    const run = () => [...findGroups(graphOf(TWO_CIRCLES, ['hub'])).of.entries()];
    expect(run()).toEqual(run());
  });

  it('does not depend on the order the papers arrive in', () => {
    const forward = findGroups(graphOf(TWO_CIRCLES, ['hub']));
    const backward = findGroups(graphOf([...TWO_CIRCLES].reverse(), ['hub']));

    for (const id of ['a1', 'a2', 'b1', 'b2', 'hub']) expect(backward.of.get(id)).toBe(forward.of.get(id));
  });

  it('gives the same groups whatever order the papers arrive in, even when a choice is a tie', () => {
    // a ring of six people, each linked equally to two neighbours: every choice is a tie
    const ring = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5'].map((id, i, all) =>
      paper(`ring${i}`, 2020, [id, all[(i + 1) % 6]!]),
    );
    const forward = findGroups(graphOf(ring));
    const backward = findGroups(graphOf([...ring].reverse()));
    const rotated = findGroups(graphOf([...ring.slice(3), ...ring.slice(0, 3)]));

    for (const id of ['r0', 'r1', 'r2', 'r3', 'r4', 'r5']) {
      expect(backward.of.get(id)).toBe(forward.of.get(id));
      expect(rotated.of.get(id)).toBe(forward.of.get(id));
    }
  });

  it('puts everyone in one group when they all write together', () => {
    const groups = findGroups(
      graphOf([paper('w1', 2020, ['a', 'b', 'c']), paper('w2', 2020, ['a', 'b', 'c'])]),
    );

    expect(groups.sizes).toEqual([3]);
  });

  it('copes with an empty graph and with only hubs', () => {
    expect(findGroups(graphOf([])).of.size).toBe(0);
    const onlyHub = findGroups(graphOf([paper('w1', 2020, ['hub'])], ['hub']));
    expect(onlyHub.of.get('hub')).toBe(0);
    expect(onlyHub.sizes).toEqual([]);
  });

  it('settles on large graphs without running forever', () => {
    const works = Array.from({ length: 200 }, (_, i) =>
      paper(`w${i}`, 2020, [`p${i % 40}`, `p${(i * 7) % 40}`, `p${(i * 13) % 40}`]),
    );
    const groups = findGroups(graphOf(works));

    expect(groups.of.size).toBeGreaterThan(10);
  });
});
