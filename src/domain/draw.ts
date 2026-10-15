import { BACKGROUND, LINK_COLOR } from './colors';
import { initials } from './initials';
import type { Graph, GraphNode } from './graph';
import type { SimNode } from './layout';
import { toScreen, type View } from './view';

/** The few canvas methods the drawing needs, so tests can supply a recording stand-in. */
export interface Ctx {
  canvas?: unknown;
  save(): void;
  restore(): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, a0: number, a1: number): void;
  fill(): void;
  stroke(): void;
  fillText(text: string, x: number, y: number): void;
  clip(): void;
  drawImage(
    image: never,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
  measureText(text: string): { width: number };
  strokeText(text: string, x: number, y: number): void;
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  globalAlpha: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  lineJoin: CanvasLineJoin;
}

/** A loaded picture, as much of it as the drawing needs. */
export interface Picture {
  naturalWidth: number;
  naturalHeight: number;
}

/** The smallest circle, in pixels, that gets initials or a photo; anything smaller is just a dot. */
const MIN_FACE_RADIUS = 8;

/** More neighbours than this, and only the bigger ones are named. */
const CROWDED = 14;
const BIG_NEIGHBOUR = 12;

export interface DrawState {
  graph: Graph;
  nodes: SimNode[];
  view: View;
  width: number;
  height: number;
  colorOf: (node: GraphNode) => string;
  selectedId: string | null;
  hoverId: string | null;
  focusId: string | null;
  /** Photos that have finished loading, by person. */
  photos: Map<string, Picture>;
}

/** The ids of a person and everyone linked to them. */
export function neighbourhood(graph: Graph, id: string | null): Set<string> {
  const ids = new Set<string>();
  if (!id) return ids;
  ids.add(id);
  for (const l of graph.links) {
    if (l.source === id) ids.add(l.target);
    else if (l.target === id) ids.add(l.source);
  }
  return ids;
}

/** Names are drawn for big nodes, and for the chosen or hovered person and their neighbours. Everyone else shows initials. */
export function shouldLabel(r: number, view: View, emphasised: boolean, dimmed: boolean): boolean {
  if (dimmed) return false;
  if (emphasised) return true;
  return r * view.k >= 16;
}

const LABEL_HEIGHT = 14;
const MAX_LABELS = 40;

interface Label {
  text: string;
  x: number;
  y: number;
  priority: number;
}

/** Picks the labels that can be drawn without covering each other, most important first. */
export function placeLabels(ctx: Pick<Ctx, 'measureText'>, labels: Label[]): Label[] {
  const placed: Label[] = [];
  const boxes: { left: number; right: number; top: number; bottom: number }[] = [];
  for (const label of [...labels].sort((a, b) => b.priority - a.priority)) {
    if (placed.length >= MAX_LABELS) break;
    const half = ctx.measureText(label.text).width / 2 + 2;
    const box = {
      left: label.x - half,
      right: label.x + half,
      top: label.y - LABEL_HEIGHT / 2,
      bottom: label.y + LABEL_HEIGHT / 2,
    };
    const overlaps = boxes.some(
      (b) => box.left < b.right && box.right > b.left && box.top < b.bottom && box.bottom > b.top,
    );
    if (overlaps) continue;
    boxes.push(box);
    placed.push(label);
  }
  return placed;
}

export function drawGraph(ctx: Ctx, state: DrawState): void {
  const { graph, nodes, view, width, height, colorOf, selectedId, hoverId, focusId, photos } = state;
  const active = hoverId ?? selectedId;
  const near = neighbourhood(graph, active);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = LINK_COLOR;
  ctx.lineJoin = 'round';
  for (const link of graph.links) {
    const a = byId.get(link.source);
    const b = byId.get(link.target);
    if (!a || !b) continue;
    const touches = active !== null && (link.source === active || link.target === active);
    ctx.globalAlpha = active === null ? 0.45 : touches ? 0.95 : 0.1;
    ctx.lineWidth = Math.min(4, 0.8 + link.papers * 0.5) * (touches ? 1.4 : 1);
    const sa = toScreen(view, a.x, a.y);
    const sb = toScreen(view, b.x, b.y);
    ctx.beginPath();
    ctx.moveTo(sa.x, sa.y);
    ctx.lineTo(sb.x, sb.y);
    ctx.stroke();
  }

  const labels: { text: string; x: number; y: number; priority: number }[] = [];
  for (const node of graph.nodes) {
    const sim = byId.get(node.id);
    if (!sim) continue;
    const dimmed = active !== null && !near.has(node.id);
    const s = toScreen(view, sim.x, sim.y);
    const r = sim.r * view.k;

    ctx.globalAlpha = dimmed ? 0.25 : 1;
    ctx.fillStyle = colorOf(node);
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();

    const photo = photos.get(node.id);
    if (photo && r >= MIN_FACE_RADIUS) {
      // a real photo, cropped square towards the top, with a ring in the colour that carries the country or group
      const side = Math.min(photo.naturalWidth, photo.naturalHeight);
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        photo as never,
        (photo.naturalWidth - side) / 2,
        (photo.naturalHeight - side) * 0.25,
        side,
        side,
        s.x - r,
        s.y - r,
        r * 2,
        r * 2,
      );
      ctx.restore();
      ctx.strokeStyle = colorOf(node);
      ctx.lineWidth = Math.max(2, r * 0.12);
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (r >= MIN_FACE_RADIUS) {
      ctx.fillStyle = BACKGROUND;
      ctx.font = `600 ${Math.min(16, r * 0.85)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials(node.name), s.x, s.y + 1);
    }

    if (node.loaded || node.id === focusId || node.id === selectedId) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = node.id === selectedId ? 3.5 : node.id === focusId ? 3 : 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r + (node.id === selectedId ? 3 : 1.5), 0, Math.PI * 2);
      ctx.stroke();
    }

    // when the chosen person is linked to a crowd, only the bigger neighbours are named, or the names pile up
    const crowded = near.size > CROWDED;
    const emphasised =
      near.has(node.id) &&
      active !== null &&
      (!crowded || node.id === active || sim.r * view.k >= BIG_NEIGHBOUR);
    if (shouldLabel(sim.r, view, emphasised, dimmed)) {
      // the chosen person first, then their neighbours, then the biggest nodes
      const priority = node.id === active ? 3e6 : emphasised ? 2e6 + sim.r : sim.r;
      labels.push({ text: node.name, x: s.x, y: s.y + r + 12, priority });
    }
  }

  ctx.globalAlpha = 1;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = BACKGROUND;
  ctx.fillStyle = '#e6edf3';
  for (const label of placeLabels(ctx, labels)) {
    ctx.strokeText(label.text, label.x, label.y);
    ctx.fillText(label.text, label.x, label.y);
  }
  ctx.restore();
}
