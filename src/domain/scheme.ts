import { COUNTRY_PALETTE, OTHER_COLOR, countryColors, countryName } from './colors';
import type { Groups } from './communities';
import type { Graph, GraphNode } from './graph';

export type ColorMode = 'country' | 'group';

export interface LegendItem {
  key: string;
  label: string;
  color: string;
  people: number;
}

/** How people are coloured, and the same information in words for anyone who cannot see the colours. */
export interface ColorScheme {
  mode: ColorMode;
  /** The name of the thing being shown by colour: "Country" or "Group". */
  noun: string;
  legend: LegendItem[];
  colorOf: (node: GraphNode) => string;
  /** The person's country or group in words, or null when not known. */
  labelOf: (node: GraphNode) => string | null;
  /** Where each coloured group is pulled to, so the groups pull apart into clusters. Null when not grouping. */
  anchors: Map<string, { x: number; y: number }> | null;
}

/** How far from the middle the groups are placed, in layout units. */
export const GROUP_RING_RADIUS = 240;

export function colorScheme(mode: ColorMode, graph: Graph, groups: Groups): ColorScheme {
  return mode === 'country' ? byCountry(graph) : byGroup(graph, groups);
}

function byCountry(graph: Graph): ColorScheme {
  const raw = countryColors(graph.nodes);
  const colors = new Map(raw.filter((r) => r.country).map((r) => [r.country!, r.color]));
  return {
    mode: 'country',
    noun: 'Country',
    legend: raw.map((r) => ({
      key: r.country ?? 'other',
      label: r.country ? countryName(r.country) : 'Other or unknown',
      color: r.color,
      people: r.people,
    })),
    colorOf: (node) => (node.country ? (colors.get(node.country) ?? OTHER_COLOR) : OTHER_COLOR),
    labelOf: (node) => (node.country ? countryName(node.country) : null),
    anchors: null,
  };
}

function byGroup(graph: Graph, groups: Groups): ColorScheme {
  const names = new Map(graph.nodes.map((n) => [n.id, n.name]));
  // only groups of at least two people get a colour of their own, biggest first; the rest share one
  const coloured = groups.sizes
    .map((size, index) => ({ size, index }))
    .filter((g) => g.size >= 2)
    .slice(0, COUNTRY_PALETTE.length);
  const colorOfGroup = new Map(coloured.map((g, i) => [g.index, COUNTRY_PALETTE[i]!]));
  const labelOfGroup = (index: number) => `Around ${names.get(groups.leaders[index]!) ?? 'someone'}`;

  const counts = new Map<number | 'other', number>();
  for (const node of graph.nodes) {
    const group = groups.of.get(node.id);
    const key = group !== undefined && colorOfGroup.has(group) ? group : 'other';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const legend: LegendItem[] = coloured.map((g) => ({
    key: `group-${g.index}`,
    label: labelOfGroup(g.index),
    color: colorOfGroup.get(g.index)!,
    people: counts.get(g.index) ?? 0,
  }));
  if ((counts.get('other') ?? 0) > 0) {
    legend.push({
      key: 'other',
      label: 'Small groups and people on their own',
      color: OTHER_COLOR,
      people: counts.get('other')!,
    });
  }

  // each coloured group gets a place on a ring, and its members drift towards it; people whose own papers were
  // loaded stay free, because they belong to every group at once
  const anchors = new Map<string, { x: number; y: number }>();
  for (const node of graph.nodes) {
    const group = groups.of.get(node.id);
    if (node.loaded || group === undefined || !colorOfGroup.has(group)) continue;
    const slot = coloured.findIndex((g) => g.index === group);
    const angle = (slot / coloured.length) * Math.PI * 2 - Math.PI / 2;
    anchors.set(node.id, { x: Math.cos(angle) * GROUP_RING_RADIUS, y: Math.sin(angle) * GROUP_RING_RADIUS });
  }

  return {
    mode: 'group',
    noun: 'Group',
    legend,
    colorOf: (node) => {
      const group = groups.of.get(node.id);
      return (group !== undefined && colorOfGroup.get(group)) || OTHER_COLOR;
    },
    labelOf: (node) => {
      const group = groups.of.get(node.id);
      return group !== undefined && colorOfGroup.has(group) ? labelOfGroup(group) : null;
    },
    anchors,
  };
}
