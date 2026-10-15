import { BACKGROUND, LINK_COLOR } from './colors';
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

/** Labels are drawn for big nodes, and for the selected or hovered person and their neighbours when zoomed in. */
export function shouldLabel(r: number, view: View, emphasised: boolean, dimmed: boolean): boolean {
  if (dimmed) return false;
  if (emphasised) return true;
  return r * view.k >= 11;
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
  const { graph, nodes, view, width, height, colorOf, selectedId, hoverId, focusId } = state;
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

    if (node.loaded || node.id === focusId || node.id === selectedId) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = node.id === selectedId ? 3.5 : node.id === focusId ? 3 : 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r + (node.id === selectedId ? 3 : 1.5), 0, Math.PI * 2);
      ctx.stroke();
    }

    const emphasised = near.has(node.id) && active !== null;
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
