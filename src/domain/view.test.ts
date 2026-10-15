import { fitView, hitTest, MAX_ZOOM, MIN_ZOOM, toScreen, toWorld, zoomAt } from './view';

describe('toWorld and toScreen', () => {
  it('convert back and forth', () => {
    const view = { x: 40, y: -10, k: 2.5 };
    const screen = toScreen(view, 7, 9);
    expect(toWorld(view, screen.x, screen.y)).toEqual({ x: 7, y: 9 });
  });
});

describe('zoomAt', () => {
  it('keeps the point under the pointer where it is', () => {
    const view = { x: 100, y: 50, k: 1 };
    const before = toWorld(view, 300, 200);

    const zoomed = zoomAt(view, 300, 200, 2);

    expect(zoomed.k).toBe(2);
    const after = toWorld(zoomed, 300, 200);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('stops at the zoom limits', () => {
    expect(zoomAt({ x: 0, y: 0, k: MAX_ZOOM }, 0, 0, 10).k).toBe(MAX_ZOOM);
    expect(zoomAt({ x: 0, y: 0, k: MIN_ZOOM }, 0, 0, 0.01).k).toBe(MIN_ZOOM);
  });
});

describe('fitView', () => {
  it('centres the points in the canvas', () => {
    const view = fitView(
      [
        { x: 100, y: 100, r: 10 },
        { x: 300, y: 100, r: 10 },
      ],
      800,
      400,
    );

    const left = toScreen(view, 90, 100);
    const right = toScreen(view, 310, 100);
    expect((left.x + right.x) / 2).toBeCloseTo(400);
    expect(left.y).toBeCloseTo(200);
  });

  it('keeps everything inside the canvas with a margin', () => {
    const points = [
      { x: -500, y: -300, r: 20 },
      { x: 500, y: 300, r: 20 },
    ];
    const view = fitView(points, 600, 400, 40);

    for (const p of points) {
      const s = toScreen(view, p.x, p.y);
      expect(s.x - p.r * view.k).toBeGreaterThanOrEqual(39);
      expect(s.x + p.r * view.k).toBeLessThanOrEqual(561);
      expect(s.y - p.r * view.k).toBeGreaterThanOrEqual(39);
      expect(s.y + p.r * view.k).toBeLessThanOrEqual(361);
    }
  });

  it('does not zoom in past the limit for a single point', () => {
    expect(fitView([{ x: 0, y: 0, r: 1 }], 800, 600).k).toBe(MAX_ZOOM);
  });

  it('returns a centred default view for no points or no space', () => {
    expect(fitView([], 800, 600)).toEqual({ x: 400, y: 300, k: 1 });
    expect(fitView([{ x: 0, y: 0, r: 5 }], 0, 0)).toEqual({ x: 0, y: 0, k: 1 });
  });
});

describe('hitTest', () => {
  const points = [
    { id: 'under', x: 0, y: 0, r: 20 },
    { id: 'over', x: 10, y: 0, r: 20 },
  ];

  it('finds the point under the position', () => {
    expect(hitTest(points, -15, 0)?.id).toBe('under');
  });

  it('prefers the one drawn on top when they overlap', () => {
    expect(hitTest(points, 5, 0)?.id).toBe('over');
  });

  it('allows a little slack around the edge', () => {
    expect(hitTest(points, 32, 0)?.id).toBe('over');
    expect(hitTest(points, 34, 0)).toBeNull();
  });

  it('returns null over empty space', () => {
    expect(hitTest(points, 200, 200)).toBeNull();
  });
});
