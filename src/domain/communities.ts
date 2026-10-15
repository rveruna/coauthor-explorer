import type { Graph } from './graph';

export interface Groups {
  /** Each person's group, numbered from 0 for the biggest. */
  of: Map<string, number>;
  /** The number of people in each group. */
  sizes: number[];
  /** The person with the most papers in each group. */
  leaders: string[];
}

const MAX_ROUNDS = 30;

/**
 * Finds circles of people who write together, by label propagation: everyone starts in a group of their own and
 * repeatedly joins the group most of their collaborators (weighted by shared papers) are in.
 *
 * People whose own papers were loaded are left out of the search, because they are linked to nearly everyone by
 * construction and would pull every group into one. They are then put in the group they share most papers with.
 * The result is the same every time: people are visited in id order and ties go to the smaller label.
 */
export function findGroups(graph: Graph): Groups {
  const hubs = new Set(graph.nodes.filter((n) => n.loaded).map((n) => n.id));
  const ids = graph.nodes
    .map((n) => n.id)
    .filter((id) => !hubs.has(id))
    .sort();

  const neighbours = new Map<string, Map<string, number>>(ids.map((id) => [id, new Map()]));
  for (const link of graph.links) {
    neighbours.get(link.source)?.set(link.target, link.papers);
    neighbours.get(link.target)?.set(link.source, link.papers);
  }
  // only links between people who are both in the search
  for (const links of neighbours.values()) {
    for (const other of [...links.keys()]) if (!neighbours.has(other)) links.delete(other);
  }

  const label = new Map(ids.map((id) => [id, id]));
  for (let round = 0; round < MAX_ROUNDS; round++) {
    let changed = false;
    for (const id of ids) {
      const weights = new Map<string, number>();
      for (const [other, papers] of neighbours.get(id)!) {
        const l = label.get(other)!;
        weights.set(l, (weights.get(l) ?? 0) + papers);
      }
      if (weights.size === 0) continue;
      let best = label.get(id)!;
      let bestWeight = weights.get(best) ?? 0;
      for (const [l, w] of weights) {
        if (w > bestWeight || (w === bestWeight && l < best)) {
          best = l;
          bestWeight = w;
        }
      }
      if (best !== label.get(id)) {
        label.set(id, best);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const papers = new Map(graph.nodes.map((n) => [n.id, n.papers]));
  const members = new Map<string, string[]>();
  for (const id of ids)
    (members.get(label.get(id)!) ?? members.set(label.get(id)!, []).get(label.get(id)!)!).push(id);

  const ranked = [...members.values()].sort((a, b) => b.length - a.length || a[0]!.localeCompare(b[0]!));
  const of = new Map<string, number>();
  const leaders: string[] = [];
  ranked.forEach((group, index) => {
    for (const id of group) of.set(id, index);
    leaders.push([...group].sort((a, b) => papers.get(b)! - papers.get(a)! || a.localeCompare(b))[0]!);
  });

  // put each hub with the group it shares the most papers with
  for (const hub of [...hubs].sort()) {
    const weight = new Map<number, number>();
    for (const link of graph.links) {
      const other = link.source === hub ? link.target : link.target === hub ? link.source : null;
      const group = other === null ? undefined : of.get(other);
      if (group !== undefined) weight.set(group, (weight.get(group) ?? 0) + link.papers);
    }
    let best = 0;
    let bestWeight = -1;
    for (const [group, w] of [...weight].sort((a, b) => a[0] - b[0])) {
      if (w > bestWeight) {
        best = group;
        bestWeight = w;
      }
    }
    of.set(hub, best);
  }

  const sizes = ranked.map((g) => g.length);
  return { of, sizes, leaders };
}
