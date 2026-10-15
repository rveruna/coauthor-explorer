import { useMemo, useState } from 'react';
import type { Graph } from '../domain/graph';
import type { ColorScheme } from '../domain/scheme';

interface Props {
  graph: Graph;
  scheme: ColorScheme;
  seedId: string;
  selectedId: string | null;
  canExpand: boolean;
  onSelect: (id: string) => void;
  onExpand: (id: string) => void;
  onCollapse: (id: string) => void;
}

type Sort = 'papers' | 'name' | 'colour';

/** Everyone in the picture, as a table. It does everything the picture does, for anyone who cannot use a picture. */
export function CollaboratorsTable({
  graph,
  scheme,
  seedId,
  selectedId,
  canExpand,
  onSelect,
  onExpand,
  onCollapse,
}: Props) {
  const [sort, setSort] = useState<Sort>('papers');
  const reference = selectedId ?? seedId;
  const referenceName = graph.nodes.find((n) => n.id === reference)?.name ?? 'the starting person';

  const together = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of graph.links) {
      if (l.source === reference) map.set(l.target, l.papers);
      else if (l.target === reference) map.set(l.source, l.papers);
    }
    return map;
  }, [graph.links, reference]);

  const rows = useMemo(() => {
    const list = [...graph.nodes];
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'colour') {
      // people whose country or group is not known go last
      list.sort((a, b) => {
        const la = scheme.labelOf(a);
        const lb = scheme.labelOf(b);
        if (!la !== !lb) return la ? -1 : 1;
        return (la ?? '').localeCompare(lb ?? '') || b.papers - a.papers || a.name.localeCompare(b.name);
      });
    } else list.sort((a, b) => b.papers - a.papers || a.name.localeCompare(b.name));
    return list;
  }, [graph.nodes, sort, scheme]);

  return (
    <section aria-labelledby="table-heading" className="table-section">
      <h2 id="table-heading">Everyone as a table</h2>
      <label className="sort">
        Sort by
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="papers">Most papers</option>
          <option value="name">Name</option>
          <option value="colour">{scheme.noun}</option>
        </select>
      </label>
      <div className="table-scroll" role="region" aria-label="People table, scrollable" tabIndex={0}>
        <table>
          <caption>People in the network, with the papers they share with {referenceName}</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Papers in this view</th>
              <th scope="col">Papers with {referenceName}</th>
              <th scope="col">{scheme.noun}</th>
              <th scope="col">Collaborators</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((node) => (
              <tr key={node.id} className={node.id === selectedId ? 'selected' : undefined}>
                <th scope="row">
                  <button
                    type="button"
                    className="link-button"
                    aria-pressed={node.id === selectedId}
                    onClick={() => onSelect(node.id)}
                  >
                    {node.name}
                  </button>
                </th>
                <td>{node.papers}</td>
                <td>{node.id === reference ? '–' : (together.get(node.id) ?? 0)}</td>
                <td>{scheme.labelOf(node) ?? 'Not known'}</td>
                <td>
                  {node.id === seedId ? (
                    'Starting point'
                  ) : node.loaded ? (
                    <button type="button" onClick={() => onCollapse(node.id)}>
                      Remove<span className="visually-hidden"> {node.name}’s collaborators</span>
                    </button>
                  ) : (
                    <button type="button" onClick={() => onExpand(node.id)} disabled={!canExpand}>
                      Add<span className="visually-hidden"> {node.name}’s collaborators</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
