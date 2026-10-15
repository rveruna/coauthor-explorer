export interface View {
  /** Screen position of the world origin. */
  x: number;
  y: number;
  /** Zoom: screen pixels per world unit. */
  k: number;
}

export const MIN_ZOOM = 0.15;
export const MAX_ZOOM = 6;

export const toWorld = (view: View, sx: number, sy: number) => ({
  x: (sx - view.x) / view.k,
  y: (sy - view.y) / view.k,
});

export const toScreen = (view: View, wx: number, wy: number) => ({
  x: wx * view.k + view.x,
  y: wy * view.k + view.y,
});

/** Zooms by a factor while keeping the world point under the screen point where it is. */
export function zoomAt(view: View, sx: number, sy: number, factor: number): View {
  const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.k * factor));
  const world = toWorld(view, sx, sy);
  return { k, x: sx - world.x * k, y: sy - world.y * k };
}

export interface Point {
  x: number;
  y: number;
  r: number;
}

/** A view that fits all the points, with a margin, centred in a canvas of the given size. */
export function fitView(points: Point[], width: number, height: number, margin = 48): View {
  if (points.length === 0 || width <= 0 || height <= 0) return { x: width / 2, y: height / 2, k: 1 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x - p.r);
    maxX = Math.max(maxX, p.x + p.r);
    minY = Math.min(minY, p.y - p.r);
    maxY = Math.max(maxY, p.y + p.r);
  }
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const k = Math.min(
    MAX_ZOOM,
    Math.max(MIN_ZOOM, Math.min((width - 2 * margin) / spanX, (height - 2 * margin) / spanY)),
  );
  return { k, x: width / 2 - ((minX + maxX) / 2) * k, y: height / 2 - ((minY + maxY) / 2) * k };
}

/** The topmost point under a world position, or null. Later points are drawn on top, so they win. */
export function hitTest<T extends Point>(points: T[], wx: number, wy: number, slack = 3): T | null {
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i]!;
    const reach = p.r + slack;
    if ((p.x - wx) ** 2 + (p.y - wy) ** 2 <= reach * reach) return p;
  }
  return null;
}
