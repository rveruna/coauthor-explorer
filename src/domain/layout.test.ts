import { EMPTY_GRAPH, buildGraph, type Graph } from './graph';
import { ForceLayout, radiusFor } from './layout';
import { paper } from '../test/works';

const OPTIONS = { years: [1900, 2100] as [number, number], maxAuthorsPerPaper: 12, maxNodes: 100 };
const graphOf = (...works: ReturnType<typeof paper>[]): Graph => buildGraph(works, new Set(), OPTIONS);

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe('radiusFor', () => {
  it('grows with the number of papers', () => {
    expect(radiusFor(1)).toBeLessThan(radiusFor(4));
    expect(radiusFor(4)).toBeLessThan(radiusFor(16));
  });

  it('is capped, and never below the size for one paper', () => {
    expect(radiusFor(100000)).toBe(28);
    expect(radiusFor(0)).toBe(radiusFor(1));
  });
});

describe('ForceLayout', () => {
  it('gives every person a position', () => {
    const layout = new ForceLayout(() => undefined);
    layout.update(graphOf(paper('w1', 2020, ['a', 'b', 'c'])));
    layout.settle();

    expect(layout.nodes).toHaveLength(3);
    for (const n of layout.nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
    layout.stop();
  });

  it('keeps people who write together closer than people who do not', () => {
    const layout = new ForceLayout(() => undefined);
    layout.update(
      graphOf(paper('w1', 2020, ['a', 'b']), paper('w2', 2020, ['a', 'b']), paper('w3', 2020, ['c', 'd'])),
    );
    layout.settle();
    const at = (id: string) => layout.nodes.find((n) => n.id === id)!;

    expect(distance(at('a'), at('b'))).toBeLessThan(distance(at('a'), at('c')));
    layout.stop();
  });

  it('keeps people where they are when new people are added', () => {
    const layout = new ForceLayout(() => undefined);
    layout.update(graphOf(paper('w1', 2020, ['a', 'b'])));
    layout.settle();
    const before = { ...layout.nodes.find((n) => n.id === 'a')! };

    layout.update(graphOf(paper('w1', 2020, ['a', 'b']), paper('w2', 2020, ['a', 'c'])));

    const after = layout.nodes.find((n) => n.id === 'a')!;
    expect([after.x, after.y]).toEqual([before.x, before.y]);
    layout.stop();
  });

  it('starts a new person near someone they are linked to', () => {
    const layout = new ForceLayout(() => undefined);
    layout.update(graphOf(paper('w1', 2020, ['a', 'b'])));
    layout.settle();
    layout.update(graphOf(paper('w1', 2020, ['a', 'b']), paper('w2', 2020, ['a', 'c'])));
    const at = (id: string) => layout.nodes.find((n) => n.id === id)!;

    expect(distance(at('c'), at('a'))).toBeLessThanOrEqual(70.001);
    layout.stop();
  });

  it('starts people in the same place every time', () => {
    const run = () => {
      const layout = new ForceLayout(() => undefined);
      layout.update(graphOf(paper('w1', 2020, ['a', 'b', 'c'])));
      const start = layout.nodes.map((n) => [n.id, n.x, n.y]);
      layout.stop();
      return start;
    };

    expect(run()).toEqual(run());
  });

  it('forgets people who are no longer in the graph', () => {
    const layout = new ForceLayout(() => undefined);
    layout.update(graphOf(paper('w1', 2020, ['a', 'b'])));
    layout.update(graphOf(paper('w1', 2020, ['a'])));

    expect(layout.nodes.map((n) => n.id)).toEqual(['a']);
    layout.stop();
  });

  it('handles an empty graph', () => {
    const layout = new ForceLayout(() => undefined);
    layout.update(EMPTY_GRAPH);
    layout.settle();

    expect(layout.nodes).toEqual([]);
    layout.stop();
  });

  it('calls back when it moves', () => {
    const onTick = vi.fn();
    const layout = new ForceLayout(onTick);
    layout.update(graphOf(paper('w1', 2020, ['a', 'b'])));
    layout.settle(5);

    expect(onTick).toHaveBeenCalled();
    layout.stop();
  });

  it('holds a pinned person in place until released', () => {
    const layout = new ForceLayout(() => undefined);
    layout.update(graphOf(paper('w1', 2020, ['a', 'b', 'c'])));
    layout.pin('a', 123, -45);
    layout.settle(30);
    const a = layout.nodes.find((n) => n.id === 'a')!;
    expect([a.x, a.y]).toEqual([123, -45]);

    layout.release('a');
    expect(a.fx).toBeNull();
    layout.stop();
  });

  it('ignores pinning someone who is not there', () => {
    const layout = new ForceLayout(() => undefined);
    layout.update(graphOf(paper('w1', 2020, ['a', 'b'])));
    expect(() => {
      layout.pin('zzz', 1, 1);
      layout.release('zzz');
    }).not.toThrow();
    layout.stop();
  });

  it('settles to rest', () => {
    const layout = new ForceLayout(() => undefined);
    layout.update(graphOf(paper('w1', 2020, ['a', 'b', 'c', 'd'])));
    layout.settle(400);

    expect(layout.running).toBe(false);
    layout.stop();
  });
});

describe('ForceLayout anchors', () => {
  const graph = graphOf(
    paper('w1', 2020, ['a1', 'a2']),
    paper('w2', 2020, ['b1', 'b2']),
    paper('w3', 2020, ['a1', 'b1']),
  );
  const left = { x: -200, y: 0 };
  const right = { x: 200, y: 0 };
  const anchors = new Map([
    ['a1', left],
    ['a2', left],
    ['b1', right],
    ['b2', right],
  ]);

  it('pulls each group towards its place', () => {
    const layout = new ForceLayout(() => undefined);
    layout.update(graph);
    layout.setAnchors(anchors);
    layout.settle(400);
    const at = (id: string) => layout.nodes.find((n) => n.id === id)!;

    expect(at('a1').x).toBeLessThan(0);
    expect(at('a2').x).toBeLessThan(0);
    expect(at('b1').x).toBeGreaterThan(0);
    expect(at('b2').x).toBeGreaterThan(0);
    layout.stop();
  });

  it('leaves no trace when anchors are set and then removed', () => {
    const settled = (setAnchorsFirst: boolean) => {
      const layout = new ForceLayout(() => undefined);
      layout.update(graph);
      if (setAnchorsFirst) {
        layout.setAnchors(anchors);
        layout.setAnchors(null);
      }
      layout.settle(300);
      const positions = layout.nodes.map((n) => [n.id, n.x, n.y]);
      layout.stop();
      return positions;
    };

    expect(settled(true)).toEqual(settled(false));
  });

  it('leaves people who have no anchor to the other forces', () => {
    const layout = new ForceLayout(() => undefined);
    layout.update(graph);
    layout.setAnchors(new Map([['a1', left]]));
    layout.settle(300);
    const at = (id: string) => layout.nodes.find((n) => n.id === id)!;

    expect(Number.isFinite(at('b2').x)).toBe(true);
    expect(at('a1').x).toBeLessThan(at('b2').x);
    layout.stop();
  });
});
