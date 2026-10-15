import { useEffect, useId, useMemo } from 'react';
import { FEATURED } from './api/snapshots';
import { CollaboratorsTable } from './components/CollaboratorsTable';
import { Controls } from './components/Controls';
import { DataStatus } from './components/DataStatus';
import { DetailsPanel } from './components/DetailsPanel';
import { GraphCanvas } from './components/GraphCanvas';
import { Legend } from './components/Legend';
import { SearchBox } from './components/SearchBox';
import { findGroups } from './domain/communities';
import { mergeFaces } from './domain/faces';
import { colorScheme } from './domain/scheme';
import { buildGraph, yearSpan } from './domain/graph';
import { MAX_EXPANDED } from './domain/settings';
import { useAvatars } from './hooks/useAvatars';
import { useNetwork } from './hooks/useNetwork';
import { usePhotos } from './hooks/usePhotos';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useSettings } from './hooks/useSettings';

const TITLE = 'Co-author Explorer';

export default function App() {
  const [settings, update] = useSettings();
  const reducedMotion = useReducedMotion();
  const helpId = useId();

  const seedId = settings.a ?? null;
  const ids = useMemo(
    () => (seedId ? [seedId, ...settings.x.filter((id) => id !== seedId)] : []),
    [seedId, settings.x],
  );
  const network = useNetwork(ids);

  const span = useMemo(() => yearSpan(network.works), [network.works]);
  const years = useMemo<[number, number]>(() => {
    if (!span) return [0, 0];
    const from = Math.min(Math.max(settings.from ?? span[0], span[0]), span[1]);
    const to = Math.max(Math.min(settings.to ?? span[1], span[1]), from);
    return [from, to];
  }, [span, settings.from, settings.to]);

  const graph = useMemo(
    () =>
      buildGraph(network.works, network.loaded, {
        years,
        maxAuthorsPerPaper: settings.max,
        maxNodes: settings.nodes,
      }),
    [network.works, network.loaded, years, settings.max, settings.nodes],
  );

  const photos = usePhotos(graph.nodes);
  const avatars = useAvatars(graph.nodes, (id) => photos.has(id));
  // a real photo wins; everyone else gets their illustrated avatar
  const faces = useMemo(
    () => mergeFaces(avatars, new Map([...photos].map(([id, p]) => [id, p.url]))),
    [avatars, photos],
  );
  const groups = useMemo(() => findGroups(graph), [graph]);
  const scheme = useMemo(() => colorScheme(settings.color, graph, groups), [settings.color, graph, groups]);

  const selectedNode = graph.nodes.find((n) => n.id === settings.sel) ?? null;
  const seedName =
    graph.nodes.find((n) => n.id === seedId)?.name ??
    FEATURED.find((f) => f.id === seedId)?.name ??
    'the starting person';
  const canExpand = settings.x.length < MAX_EXPANDED;
  const seedFailure = network.failed.find((f) => f.id === seedId)?.error ?? null;
  const otherFailures = network.failed.filter((f) => f.id !== seedId);

  useEffect(() => {
    document.title = seedId && seedName !== 'the starting person' ? `${seedName}: ${TITLE}` : TITLE;
  }, [seedId, seedName]);

  const start = (id: string) =>
    update({ a: id, x: [], sel: id, from: undefined, to: undefined }, { push: true });
  const expand = (id: string) => {
    if (settings.x.includes(id) || id === seedId || !canExpand) return;
    update({ x: [...settings.x, id], sel: id });
  };
  const collapse = (id: string) => update({ x: settings.x.filter((x) => x !== id) });

  const summary = seedId
    ? graph.nodes.length === 0
      ? ''
      : `Showing ${graph.nodes.length} people and ${graph.links.length} collaborations from ${network.loaded.size === 1 ? 'one researcher’s' : `${network.loaded.size} researchers’`} most cited papers, ${years[0]} to ${years[1]}.`
    : '';

  return (
    <>
      <header>
        <h1>{TITLE}</h1>
        <p>
          See who researchers write papers with, as a live network you can explore, using open data from
          OpenAlex.
        </p>
        <SearchBox onPick={(author) => start(author.id)} />
      </header>

      <main id="main">
        {!seedId ? (
          <section className="welcome" aria-labelledby="welcome-heading">
            <h2 id="welcome-heading">Start with someone</h2>
            <p>
              Search above, or begin with one of these. They load from OpenAlex, with a saved copy as a
              fallback.
            </p>
            <ul className="featured">
              {FEATURED.map((f) => (
                <li key={f.id}>
                  <button type="button" onClick={() => start(f.id)}>
                    {f.name}
                  </button>
                </li>
              ))}
            </ul>
            <h2>How it works</h2>
            <ul>
              <li>Each dot is a researcher. Two dots are joined when they are credited on the same paper.</li>
              <li>
                Double-click a dot, or use the button in the details panel, to load that person’s own
                collaborators.
              </li>
              <li>Narrow the years to watch collaborations appear and disappear.</li>
            </ul>
          </section>
        ) : (
          <>
            <DataStatus
              loading={network.loading.length}
              usingSnapshot={network.usingSnapshot}
              savedAt={network.savedAt}
              seedFailure={seedFailure}
              otherFailures={otherFailures}
              onRetry={network.retry}
              onRemove={collapse}
              onPickFeatured={start}
              seedId={seedId}
            />

            {graph.nodes.length > 0 && span && (
              <>
                <p role="status" className="summary">
                  {summary}
                </p>
                <div className="workspace">
                  <section className="stage" aria-labelledby="graph-heading">
                    <h2 id="graph-heading">Network</h2>
                    <p id={helpId} className="help">
                      Drag a person to move them, drag the background to pan, scroll to zoom, double-click to
                      load someone’s collaborators. From the keyboard: Tab to the network, arrow keys to move
                      between people, Enter to load collaborators, plus and minus to zoom, 0 to fit. The table
                      below lists everyone.
                    </p>
                    <GraphCanvas
                      graph={graph}
                      selectedId={selectedNode?.id ?? null}
                      focusId={seedId}
                      fitKey={seedId}
                      colorOf={scheme.colorOf}
                      anchors={scheme.anchors}
                      faces={faces}
                      reducedMotion={reducedMotion}
                      onSelect={(id) => update({ sel: id ?? undefined })}
                      onExpand={expand}
                      helpId={helpId}
                    />
                    <Legend legend={scheme.legend} noun={scheme.noun} />
                  </section>
                  <aside className="side">
                    <Controls
                      settings={settings}
                      span={span}
                      years={years}
                      skippedPapers={graph.skippedPapers}
                      hidden={graph.hidden}
                      onChange={update}
                    />
                    <DetailsPanel
                      node={selectedNode}
                      seedId={seedId}
                      seedName={seedName}
                      works={network.works}
                      photo={selectedNode ? photos.get(selectedNode.id) : undefined}
                      avatar={selectedNode ? avatars.get(selectedNode.id) : undefined}
                      loaded={selectedNode ? settings.x.includes(selectedNode.id) : false}
                      canExpand={canExpand}
                      onExpand={expand}
                      onCollapse={collapse}
                      onExplore={start}
                    />
                  </aside>
                </div>
                <CollaboratorsTable
                  graph={graph}
                  scheme={scheme}
                  seedId={seedId}
                  selectedId={selectedNode?.id ?? null}
                  canExpand={canExpand}
                  onSelect={(id) => update({ sel: id })}
                  onExpand={expand}
                  onCollapse={collapse}
                />
              </>
            )}
          </>
        )}
      </main>

      <footer>
        <p>
          Data from <a href="https://openalex.org">OpenAlex</a>, an open index of research. Real photos, where
          there is one, come from Wikimedia Commons through Wikidata and are matched by ORCID iD, never by
          name. Everyone else has an illustrated avatar made from their id, which is not their real face
          (Personas by <a href="https://personas.draftbit.com/">Draftbit</a>,{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, drawn in your browser with{' '}
          <a href="https://www.dicebear.com/">DiceBear</a>). This is an independent project, not affiliated
          with OpenAlex. Researchers are identified by OpenAlex’s automatic author matching, which sometimes
          merges or splits people, so treat the network as a guide, not a record.
        </p>
      </footer>
    </>
  );
}
