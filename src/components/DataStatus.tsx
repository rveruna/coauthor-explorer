import { OpenAlexError } from '../api/openalexClient';
import { FEATURED } from '../api/snapshots';

interface Props {
  loading: number;
  usingSnapshot: boolean;
  savedAt: string | null;
  seedFailure: Error | null;
  otherFailures: { id: string; error: Error }[];
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onPickFeatured: (id: string) => void;
  seedId: string;
}

function explain(error: Error): string {
  if (error instanceof OpenAlexError) {
    switch (error.kind) {
      case 'rate-limited':
        return 'OpenAlex’s free allowance for today has been used up. It resets at midnight UTC. The featured researchers still work from saved copies.';
      case 'network':
        return 'Could not reach OpenAlex. The featured researchers still work from saved copies.';
      case 'not-found':
        return 'OpenAlex has no record for that researcher.';
      case 'invalid':
        return 'OpenAlex sent data this app could not read.';
      default:
        return `OpenAlex could not provide the data (status ${error.status}).`;
    }
  }
  return 'Something went wrong getting the data.';
}

export function DataStatus({
  loading,
  usingSnapshot,
  savedAt,
  seedFailure,
  otherFailures,
  onRetry,
  onRemove,
  onPickFeatured,
  seedId,
}: Props) {
  return (
    <div className="status-area">
      {seedFailure && (
        <div role="alert" className="banner banner-error">
          <p>{explain(seedFailure)}</p>
          <button type="button" onClick={() => onRetry(seedId)}>
            Try again
          </button>
          {FEATURED.map((f) => (
            <button key={f.id} type="button" onClick={() => onPickFeatured(f.id)}>
              {f.name}
            </button>
          ))}
        </div>
      )}
      {otherFailures.map(({ id, error }) => (
        <div role="alert" className="banner banner-error" key={id}>
          <p>Could not add that person’s collaborators. {explain(error)}</p>
          <button type="button" onClick={() => onRetry(id)}>
            Try again
          </button>
          <button type="button" onClick={() => onRemove(id)}>
            Remove
          </button>
        </div>
      ))}
      {usingSnapshot && (
        <p role="note" className="banner banner-warn">
          Some of this is a saved copy of OpenAlex data from {savedAt}, not live data, because OpenAlex could
          not be reached or its free limit has been used up.
        </p>
      )}
      {loading > 0 && (
        <p role="status" className="banner">
          Loading {loading === 1 ? 'a researcher’s' : `${loading} researchers’`} papers from OpenAlex…
        </p>
      )}
    </div>
  );
}
