import { useAuthor } from '../hooks/useNetwork';
import type { GraphNode } from '../domain/graph';
import { countryName } from '../domain/colors';
import type { Work } from '../domain/types';
import { openAlexAuthorUrl, openAlexWorkUrl, sharedWorks } from '../domain/works';

interface Props {
  node: GraphNode | null;
  seedId: string | null;
  seedName: string;
  works: Work[];
  loaded: boolean;
  canExpand: boolean;
  onExpand: (id: string) => void;
  onCollapse: (id: string) => void;
  onExplore: (id: string) => void;
}

const number = (n: number) => n.toLocaleString('en-GB');

export function DetailsPanel({
  node,
  seedId,
  seedName,
  works,
  loaded,
  canExpand,
  onExpand,
  onCollapse,
  onExplore,
}: Props) {
  const author = useAuthor(node?.id ?? null);

  if (!node) {
    return (
      <section className="details" aria-labelledby="details-heading">
        <h2 id="details-heading">Details</h2>
        <p className="help">
          Select a person in the network or the table to see who they are and what they wrote together.
        </p>
      </section>
    );
  }

  const isSeed = node.id === seedId;
  const papers = isSeed
    ? [
        ...new Map(
          works.filter((w) => w.authors.some((a) => a.id === node.id)).map((w) => [w.id, w]),
        ).values(),
      ]
        .sort((a, b) => b.citations - a.citations)
        .slice(0, 5)
    : sharedWorks(works, node.id, seedId ?? '').slice(0, 5);

  return (
    <section className="details" aria-labelledby="details-heading">
      <h2 id="details-heading">{node.name}</h2>
      <dl>
        {author.data?.institution && (
          <div>
            <dt>Institution</dt>
            <dd>{author.data.institution}</dd>
          </div>
        )}
        {node.country && (
          <div>
            <dt>Country</dt>
            <dd>{countryName(node.country)}</dd>
          </div>
        )}
        <div>
          <dt>Papers in this view</dt>
          <dd>{node.papers}</dd>
        </div>
        {author.data && (
          <>
            <div>
              <dt>Papers on OpenAlex</dt>
              <dd>{number(author.data.worksCount)}</dd>
            </div>
            <div>
              <dt>Citations</dt>
              <dd>{number(author.data.citations)}</dd>
            </div>
          </>
        )}
      </dl>

      <p className="links">
        <a href={openAlexAuthorUrl(node.id)} target="_blank" rel="noreferrer">
          OpenAlex profile<span className="visually-hidden"> (opens in a new tab)</span>
        </a>
        {node.orcid && (
          <>
            {' · '}
            <a href={node.orcid} target="_blank" rel="noreferrer">
              ORCID<span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </>
        )}
      </p>

      <div className="actions">
        {isSeed ? (
          <p className="help">This is where the network started.</p>
        ) : loaded ? (
          <button type="button" onClick={() => onCollapse(node.id)}>
            Remove {node.name}’s collaborators
          </button>
        ) : (
          <button type="button" onClick={() => onExpand(node.id)} disabled={!canExpand}>
            Add {node.name}’s collaborators
          </button>
        )}
        {!isSeed && !canExpand && !loaded && (
          <p className="help">You can add up to 6 people. Remove one first.</p>
        )}
        {!isSeed && (
          <button type="button" onClick={() => onExplore(node.id)}>
            Start again from {node.name}
          </button>
        )}
      </div>

      {papers.length > 0 && (
        <>
          <h3>{isSeed ? 'Most cited papers' : `Papers with ${seedName}`}</h3>
          <ul className="papers">
            {papers.map((w) => (
              <li key={w.id}>
                <a href={openAlexWorkUrl(w.id)} target="_blank" rel="noreferrer">
                  {w.title}
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>{' '}
                <span className="meta">
                  {w.year} · {number(w.citations)} citations
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
