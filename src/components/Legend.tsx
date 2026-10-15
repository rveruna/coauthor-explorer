import type { LegendItem } from '../domain/scheme';

interface Props {
  legend: LegendItem[];
  noun: string;
}

export function Legend({ legend, noun }: Props) {
  if (legend.length === 0) return null;
  return (
    <section className="legend" aria-labelledby="legend-heading">
      <h2 id="legend-heading">Key</h2>
      <ul>
        {legend.map((item) => (
          <li key={item.key}>
            <span className="swatch" style={{ background: item.color }} aria-hidden="true" />
            {item.label} <span className="count">{item.people}</span>
          </li>
        ))}
      </ul>
      <p className="help">
        {noun === 'Country'
          ? 'Colour is the country a person is most often credited in.'
          : 'Colour is a circle of people who write together, found automatically. People who were expanded join the circle they share most papers with.'}{' '}
        Size is the number of papers. A white ring means their own collaborators have been loaded. Faces are
        real photos where one could be matched. Otherwise they are illustrations made from an id, not the
        person’s real face.
      </p>
    </section>
  );
}
