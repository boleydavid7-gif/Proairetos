import { useEffect, useState } from 'react';
import type { Nav } from '../app/App';
import { useRecipes } from '../app/state';
import { BackLink } from '../app/ui';

/** A moment before eating: half a minute of slow breaths and one line. Leave at any time. */
export default function PausePage({ nav, id }: { nav: Nav; id: string }) {
  const recipe = useRecipes()?.find((each) => each.id === id);
  const [left, setLeft] = useState(30);
  useEffect(() => {
    if (left <= 0) return;
    const timer = window.setTimeout(() => setLeft(left - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [left]);
  return (
    <div className="page pause-meal">
      <BackLink label="Done" onBack={nav.back} />
      <div className="pause-meal__circle" aria-hidden="true" />
      <p className="pause-meal__breath">{left > 0 ? 'Breathe in as it grows, out as it settles.' : 'Enjoy your meal.'}</p>
      <blockquote className="daily-line">
        “Is anything brought round to you? Put out your hand and take your share with moderation.”
        <cite>After Epictetus, Enchiridion 15</cite>
      </blockquote>
      {recipe && <p className="muted">{recipe.title}</p>}
      <button type="button" className="button-quiet" onClick={nav.back}>
        {left > 0 ? 'That’s enough' : 'Done'}
      </button>
    </div>
  );
}
