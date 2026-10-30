import { useState } from 'react';
import { tap } from '../../../app/feel';

/** The Stoics' split, as a sailor meets it: four things to sort, any way the person sees them. Nothing is marked right or wrong. */
const THINGS = ['The wind', 'The waves', 'How you set your sails', 'Where you steer'] as const;

type Side = 'mine' | 'not';

export default function Sails({ onSorted }: { onSorted: () => void }) {
  const [sides, setSides] = useState<Partial<Record<(typeof THINGS)[number], Side>>>({});
  const place = (thing: (typeof THINGS)[number], side: Side) => {
    tap();
    const next = { ...sides, [thing]: side };
    setSides(next);
    if (THINGS.every((each) => next[each])) onSorted();
  };
  return (
    <div className="sails" role="group" aria-label="Up to you, or not">
      {THINGS.map((thing) => (
        <div key={thing} className="sails__card" data-side={sides[thing]}>
          <span className="sails__thing">{thing}</span>
          <span className="sails__choice">
            <button type="button" aria-pressed={sides[thing] === 'mine'} onClick={() => place(thing, 'mine')}>
              Up to me
            </button>
            <button type="button" aria-pressed={sides[thing] === 'not'} onClick={() => place(thing, 'not')}>
              Not up to me
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
