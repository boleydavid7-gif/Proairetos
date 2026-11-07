import { useEffect, useRef, useState } from 'react';
import { ChevronIcon } from '../../app/family/icons';
import type { PhytonNav } from '../app/App';
import { findSpecies, SPECIES, speciesForLatin, type Kind } from '../core/species';

const KINDS: Kind[] = ['Houseplant', 'Succulent or cactus', 'Herb', 'Vegetable or fruit', 'Garden'];

/** Look up a plant by name and read its care, without adding it. */
export default function LookupPage({ nav }: { nav: PhytonNav }) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<Kind | undefined>();
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => field.current?.focus(), []);
  const words = query.trim();
  const direct = words ? findSpecies(words, 12) : kind ? SPECIES.filter((each) => each.kind === kind) : [];
  // A Latin name the table does not hold by name still leads to its genus.
  const close = words && !direct.length ? speciesForLatin(words) : undefined;
  const found = close ? [close] : direct;

  return (
    <div className="page phyton-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Back</button>
        <p className="label">Look up a plant</p>
        <span />
      </div>

      <label className="field">
        <span className="field__label">Plant name</span>
        <input ref={field} className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      {!words && (
        <div className="chip-row" role="group" aria-label="Kinds">
          {KINDS.map((each) => (
            <button key={each} type="button" className="chip" aria-pressed={kind === each} onClick={() => setKind(kind === each ? undefined : each)}>{each}</button>
          ))}
        </div>
      )}

      {found.length > 0 && (
        <ul className="rows">
          {found.map((each) => (
            <li key={each.key}>
              <button type="button" className="row row--plain" onClick={() => nav.go({ name: 'care', species: each.key })}>
                <span className="row__text"><span>{each.name}</span><span className="row__detail">{[each.latin, ...(each.also ?? []).slice(0, 2)].join(' · ')}</span></span>
                <ChevronIcon size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {words && found.length === 0 && (
        <section className="card">
          <p className="muted">No care notes for “{words}” yet.</p>
          <div className="button-row">
            <button type="button" className="button-quiet" onClick={() => nav.swap({ name: 'plant', given: words })}>Add “{words}”</button>
            <a className="text-link" href={`https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(words)}`} target="_blank" rel="noopener noreferrer">Search Wikipedia</a>
          </div>
        </section>
      )}
    </div>
  );
}
