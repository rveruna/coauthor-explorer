import { useId } from 'react';
import { NODE_LIMITS, type Settings } from '../domain/settings';

interface Props {
  settings: Settings;
  /** The first and last year of the papers loaded. */
  span: [number, number];
  years: [number, number];
  skippedPapers: number;
  hidden: number;
  onChange: (patch: Partial<Settings>) => void;
}

export function Controls({ settings, span, years, skippedPapers, hidden, onChange }: Props) {
  const [from, to] = years;
  const id = useId();
  // the whole range is stored as "no choice", so a shared link only carries what was changed
  const store = (value: number, bound: number) => (value === bound ? undefined : value);

  return (
    <form className="controls" aria-label="Network settings" onSubmit={(e) => e.preventDefault()}>
      <h2>Settings</h2>

      <fieldset>
        <legend>Colour people by</legend>
        <label className="choice">
          <input
            type="radio"
            name={`${id}-color`}
            checked={settings.color === 'country'}
            onChange={() => onChange({ color: 'country' })}
          />
          Country
        </label>
        <label className="choice">
          <input
            type="radio"
            name={`${id}-color`}
            checked={settings.color === 'group'}
            onChange={() => onChange({ color: 'group' })}
          />
          Group of collaborators
        </label>
      </fieldset>

      <div className="field">
        <label htmlFor={`${id}-from`}>From year</label>
        <output htmlFor={`${id}-from`}>{from}</output>
        <input
          id={`${id}-from`}
          type="range"
          min={span[0]}
          max={span[1]}
          value={from}
          onChange={(e) => {
            const value = Math.min(Number(e.target.value), to);
            onChange({ from: store(value, span[0]) });
          }}
        />
      </div>

      <div className="field">
        <label htmlFor={`${id}-to`}>To year</label>
        <output htmlFor={`${id}-to`}>{to}</output>
        <input
          id={`${id}-to`}
          type="range"
          min={span[0]}
          max={span[1]}
          value={to}
          onChange={(e) => {
            const value = Math.max(Number(e.target.value), from);
            onChange({ to: store(value, span[1]) });
          }}
        />
      </div>

      <div className="field">
        <label htmlFor={`${id}-max`}>Ignore papers with more than this many authors</label>
        <output htmlFor={`${id}-max`}>{settings.max}</output>
        <input
          id={`${id}-max`}
          type="range"
          min={3}
          max={50}
          value={settings.max}
          aria-describedby={`${id}-max-help`}
          onChange={(e) => onChange({ max: Number(e.target.value) })}
        />
      </div>
      <p id={`${id}-max-help`} className="help">
        {skippedPapers === 0
          ? 'No papers are being ignored. Papers with huge author lists link everyone to everyone, so a limit keeps the picture meaningful.'
          : `${skippedPapers} ${skippedPapers === 1 ? 'paper is' : 'papers are'} being ignored. Papers with huge author lists link everyone to everyone.`}
      </p>

      <label htmlFor={`${id}-nodes`}>Most people to show</label>
      <select
        id={`${id}-nodes`}
        value={settings.nodes}
        onChange={(e) => onChange({ nodes: Number(e.target.value) })}
      >
        {NODE_LIMITS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      {hidden > 0 && (
        <p className="help">
          {hidden} {hidden === 1 ? 'person is' : 'people are'} hidden. The ones with the fewest papers go
          first.
        </p>
      )}
    </form>
  );
}
