import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
} from 'd3-force';
import type { Graph } from './graph';

export interface SimNode {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  r: number;
}

interface SimLink {
  source: SimNode | string;
  target: SimNode | string;
  papers: number;
}

/** How firmly people are drawn to their group's place. */
const ANCHOR_STRENGTH = 0.09;

/** A node's radius in world units: bigger for people on more papers, within limits. */
export function radiusFor(papers: number): number {
  return Math.min(24, 5 + 3 * Math.sqrt(Math.max(papers, 1)));
}

/** A repeatable pseudo-random number from a string, so the same person always starts in the same place. */
function hash01(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Wraps a d3 force simulation. Updating with a new graph keeps the people already on screen where they are and
 * starts new ones next to someone they are linked to, so expanding a person grows the picture instead of
 * reshuffling it.
 */
export class ForceLayout {
  nodes: SimNode[] = [];
  private links: SimLink[] = [];
  private sim: Simulation<SimNode, undefined>;
  private byId = new Map<string, SimNode>();
  private anchors = new Map<string, { x: number; y: number }>();

  constructor(private onTick: () => void) {
    this.sim = forceSimulation<SimNode>([])
      .force('charge', forceManyBody<SimNode>().strength(-170).distanceMax(500))
      .force('center', forceCenter(0, 0).strength(0.03))
      .force(
        'collide',
        forceCollide<SimNode>().radius((d) => d.r + 5),
      )
      .force(
        'anchorX',
        forceX<SimNode>((d) => this.anchors.get(d.id)?.x ?? 0).strength((d) =>
          this.anchors.has(d.id) ? ANCHOR_STRENGTH : 0,
        ),
      )
      .force(
        'anchorY',
        forceY<SimNode>((d) => this.anchors.get(d.id)?.y ?? 0).strength((d) =>
          this.anchors.has(d.id) ? ANCHOR_STRENGTH : 0,
        ),
      )
      .on('tick', () => this.onTick())
      .stop();
  }

  update(graph: Graph): void {
    const previous = this.byId;
    const next = new Map<string, SimNode>();
    const neighbours = new Map<string, string[]>();
    for (const l of graph.links) {
      (neighbours.get(l.source) ?? neighbours.set(l.source, []).get(l.source)!).push(l.target);
      (neighbours.get(l.target) ?? neighbours.set(l.target, []).get(l.target)!).push(l.source);
    }

    for (const node of graph.nodes) {
      const existing = previous.get(node.id);
      if (existing) {
        existing.r = radiusFor(node.papers);
        next.set(node.id, existing);
        continue;
      }
      const anchor = (neighbours.get(node.id) ?? []).map((id) => previous.get(id)).find(Boolean);
      const angle = hash01(node.id) * Math.PI * 2;
      const distance = 30 + hash01(`${node.id}!`) * 40;
      next.set(node.id, {
        id: node.id,
        x: (anchor?.x ?? 0) + Math.cos(angle) * distance,
        y: (anchor?.y ?? 0) + Math.sin(angle) * distance,
        r: radiusFor(node.papers),
      });
    }

    this.byId = next;
    this.nodes = graph.nodes.map((n) => next.get(n.id)!);
    this.links = graph.links.map((l) => ({ source: l.source, target: l.target, papers: l.papers }));

    this.sim.nodes(this.nodes);
    this.sim.force(
      'link',
      forceLink<SimNode, SimLink>(this.links)
        .id((d) => d.id)
        .distance((l) => 95 - Math.min(35, l.papers * 4))
        .strength((l) => Math.min(0.9, 0.15 + l.papers * 0.1)),
    );
  }

  /** Pulls people towards places, such as the places of their groups. Null lets everyone go free. */
  setAnchors(anchors: Map<string, { x: number; y: number }> | null): void {
    this.anchors = anchors ?? new Map();
    // d3 works out each force's strength when the nodes are assigned, so assign them again
    this.sim.nodes(this.nodes);
  }

  /** Lets the picture move for a while, then settle. */
  start(alpha = 0.7): void {
    this.sim.alpha(alpha).restart();
  }

  /** Runs the layout to rest at once, without animation, for people who prefer reduced motion. */
  settle(ticks = 300): void {
    this.sim.alpha(1);
    this.sim.tick(ticks);
    this.onTick();
  }

  pin(id: string, x: number, y: number): void {
    const node = this.byId.get(id);
    if (!node) return;
    node.fx = x;
    node.fy = y;
    this.sim.alphaTarget(0.25).restart();
  }

  release(id: string): void {
    const node = this.byId.get(id);
    if (node) {
      node.fx = null;
      node.fy = null;
    }
    this.sim.alphaTarget(0);
  }

  get running(): boolean {
    return this.sim.alpha() >= this.sim.alphaMin();
  }

  stop(): void {
    this.sim.stop();
  }
}
