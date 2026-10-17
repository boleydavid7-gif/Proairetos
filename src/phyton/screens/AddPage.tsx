import { useEffect, useRef, useState } from 'react';
import { CameraIcon, ChevronIcon } from '../../app/family/icons';
import type { PhytonNav } from '../app/App';
import { findSpecies, SPECIES, type Kind } from '../core/species';

const KINDS: Kind[] = ['Houseplant', 'Succulent or cactus', 'Herb', 'Vegetable or fruit', 'Garden'];

/** Adding a plant: find its type by name, identify it from a photo, or name it yourself. */
export default function AddPage({ nav }: { nav: PhytonNav }) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<Kind | undefined>();
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => field.current?.focus(), []);
  const found = query.trim() ? findSpecies(query, 12) : kind ? SPECIES.filter((each) => each.kind === kind) : [];

  return (
    <div className="page phyton-page">
      <div className="page-top section-head">
        <button type="button" className="back-link" onClick={nav.back}>Cancel</button>
        <p className="label">Add a plant</p>
        <span />
      </div>

      <button type="button" className="row identify-row" onClick={() => nav.swap({ name: 'identify' })}>
        <span className="row__icon"><CameraIcon size={22} /></span>
        <span className="row__text"><span>Identify from a photo</span><span className="row__detail">By Pl@ntNet</span></span>
        <ChevronIcon size={18} />
      </button>

      <label className="field">
        <span className="field__label">Or find its type</span>
        <input ref={field} className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pothos, basil, monstera…" />
      </label>
      {!query.trim() && (
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
              <button type="button" className="row row--plain" onClick={() => nav.swap({ name: 'plant', species: each.key })}>
                <span className="row__text"><span>{each.name}</span><span className="row__detail">{[each.latin, ...(each.also ?? []).slice(0, 2)].join(' · ')}</span></span>
                <ChevronIcon size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && (
        <button type="button" className="button-quiet" onClick={() => nav.swap({ name: 'plant', given: query.trim() })}>
          {found.length ? `Something else: “${query.trim()}”` : `Add “${query.trim()}”`}
        </button>
      )}
    </div>
  );
}
