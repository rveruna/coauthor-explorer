import { OTHER_COLOR } from './colors';
import { colorScheme } from './scheme';
import { findGroups } from './communities';
import { drawGraph, neighbourhood, placeLabels, shouldLabel, type Ctx, type DrawState } from './draw';
import { buildGraph } from './graph';
import { paper, person } from '../test/works';

/** Records what is drawn: each fill with its colour and alpha, and each stroke and text. */
function recorder() {
  const log = {
    fills: [] as { color: string; alpha: number }[],
    texts: [] as string[],
    strokes: 0,
    rects: 0,
  };
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    lineJoin: 'miter',
    save() {},
    restore() {},
    clearRect() {},
    fillRect() {
      log.rects++;
    },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    fill() {
      log.fills.push({ color: String(ctx.fillStyle), alpha: ctx.globalAlpha });
    },
    stroke() {
      log.strokes++;
    },
    fillText(text: string) {
      log.texts.push(text);
    },
    measureText(text: string) {
      return { width: text.length * 6 };
    },
    strokeText() {},
  } as unknown as Ctx;
  return { ctx, log };
}

const works = [
  paper('w1', 2020, [person('a', ['US']), person('b', ['US']), person('c', ['GB'])]),
  paper('w2', 2021, [person('a', ['US']), person('d', ['FR'])]),
];
const graph = buildGraph(works, new Set(['a']), {
  years: [1900, 2100],
  maxAuthorsPerPaper: 12,
  maxNodes: 100,
});
const colorOf = colorScheme('country', graph, findGroups(graph)).colorOf;

function stateWith(overrides: Partial<DrawState> = {}): DrawState {
  return {
    graph,
    nodes: graph.nodes.map((n, i) => ({ id: n.id, x: i * 60, y: 0, r: 20 })),
    view: { x: 100, y: 100, k: 1 },
    width: 600,
    height: 400,
    colorOf,
    selectedId: null,
    hoverId: null,
    focusId: 'a',
    ...overrides,
  };
}

describe('neighbourhood', () => {
  it('is a person and the people linked to them', () => {
    expect([...neighbourhood(graph, 'd')].sort()).toEqual(['a', 'd']);
    expect([...neighbourhood(graph, 'a')].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('is empty when nobody is chosen', () => {
    expect(neighbourhood(graph, null).size).toBe(0);
  });
});

describe('shouldLabel', () => {
  const view = { x: 0, y: 0, k: 1 };

  it('labels big nodes and not small ones', () => {
    expect(shouldLabel(12, view, false, false)).toBe(true);
    expect(shouldLabel(6, view, false, false)).toBe(false);
  });

  it('labels small nodes once zoomed in', () => {
    expect(shouldLabel(6, { ...view, k: 2 }, false, false)).toBe(true);
  });

  it('labels emphasised nodes and never dimmed ones', () => {
    expect(shouldLabel(6, view, true, false)).toBe(true);
    expect(shouldLabel(24, view, true, true)).toBe(false);
  });
});

describe('drawGraph', () => {
  it('paints the background and a circle for every person in their country’s colour', () => {
    const { ctx, log } = recorder();

    drawGraph(ctx, stateWith());

    expect(log.rects).toBe(1);
    expect(log.fills).toHaveLength(graph.nodes.length);
    const colours = log.fills.map((f) => f.color);
    expect(colours).toContain(colorOf(graph.nodes.find((n) => n.country === 'US')!));
    expect(colours).toContain(colorOf(graph.nodes.find((n) => n.country === 'GB')!));
  });

  it('draws every person at full strength when nobody is chosen', () => {
    const { ctx, log } = recorder();

    drawGraph(ctx, stateWith());

    expect(log.fills.every((f) => f.alpha === 1)).toBe(true);
  });

  it('dims people who are not linked to the person chosen', () => {
    const { ctx, log } = recorder();

    drawGraph(ctx, stateWith({ selectedId: 'd' }));

    const dimmed = log.fills.filter((f) => f.alpha < 1);
    expect(dimmed).toHaveLength(2);
    expect(log.fills.filter((f) => f.alpha === 1)).toHaveLength(2);
  });

  it('lets hovering override the selection', () => {
    const { ctx, log } = recorder();

    drawGraph(ctx, stateWith({ selectedId: 'd', hoverId: 'b' }));

    // b is linked to a and c, so d is dimmed
    expect(log.fills.filter((f) => f.alpha < 1)).toHaveLength(1);
  });

  it('writes the names of the chosen person and their neighbours', () => {
    const { ctx, log } = recorder();

    drawGraph(ctx, stateWith({ selectedId: 'd' }));

    expect(log.texts.sort()).toEqual(['Person a', 'Person d']);
  });

  it('keeps the chosen person’s name when it would be covered by a neighbour’s', () => {
    const { ctx, log } = recorder();
    // everyone in the same place with the same size, so every name lands on top of every other
    const stacked = graph.nodes.map((n) => ({ id: n.id, x: 0, y: 0, r: 20 }));

    drawGraph(ctx, stateWith({ nodes: stacked, selectedId: 'd' }));

    expect(log.texts).toEqual(['Person d']);
  });

  it('rings the people who were expanded, the starting person and the selection', () => {
    const { ctx, log } = recorder();

    drawGraph(ctx, stateWith({ selectedId: 'c' }));
    const links = graph.links.length;

    // links, plus a ring for a (expanded and the focus) and one for c (selected)
    expect(log.strokes).toBe(links + 2);
  });

  it('uses the neutral colour for a country with no colour', () => {
    const { ctx, log } = recorder();

    drawGraph(ctx, stateWith({ colorOf: () => OTHER_COLOR }));

    expect(log.fills.every((f) => f.color === OTHER_COLOR)).toBe(true);
  });

  it('skips people the layout has not placed yet', () => {
    const { ctx, log } = recorder();

    drawGraph(ctx, stateWith({ nodes: [] }));

    expect(log.fills).toHaveLength(0);
  });
});

describe('placeLabels', () => {
  const measure = { measureText: (text: string) => ({ width: text.length * 6 }) };
  const label = (text: string, x: number, y: number, priority: number) => ({ text, x, y, priority });

  it('keeps labels that do not touch', () => {
    const placed = placeLabels(measure, [
      label('Ada', 0, 0, 1),
      label('Bo', 200, 0, 1),
      label('Cy', 0, 100, 1),
    ]);
    expect(placed).toHaveLength(3);
  });

  it('drops the less important of two labels that overlap', () => {
    const placed = placeLabels(measure, [label('Minor', 10, 2, 1), label('Major', 0, 0, 9)]);
    expect(placed.map((l) => l.text)).toEqual(['Major']);
  });

  it('does not treat labels that only touch edge to edge as overlapping', () => {
    // each is 3 characters wide: 18px of text plus 4px of padding, so 22px across
    const placed = placeLabels(measure, [label('abc', 0, 0, 2), label('def', 22, 0, 1)]);
    expect(placed).toHaveLength(2);
  });

  it('treats labels above and below each other as separate', () => {
    expect(placeLabels(measure, [label('abc', 0, 0, 2), label('def', 0, 14, 1)])).toHaveLength(2);
    expect(placeLabels(measure, [label('abc', 0, 0, 2), label('def', 0, 13, 1)])).toHaveLength(1);
  });

  it('draws at most 40 labels', () => {
    const many = Array.from({ length: 100 }, (_, i) => label('x', i * 100, 0, i));
    expect(placeLabels(measure, many)).toHaveLength(40);
  });

  it('does not change the labels it is given', () => {
    const labels = [label('b', 0, 0, 1), label('a', 500, 0, 9)];
    placeLabels(measure, labels);
    expect(labels.map((l) => l.text)).toEqual(['b', 'a']);
  });
});
