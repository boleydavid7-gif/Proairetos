import { useState } from 'react';
import { isOwner } from '../app/family/purchases';
import { applyAppearance } from '../app/appearance';
import { loadAppearance } from '../data/storage/preferences';

const FILL = Array.from({ length: 6 }, (_, i) => i);

export default function Lab() {
  const [theme, setTheme] = useState(loadAppearance().theme);
  const [prototype, setPrototype] = useState(false);
  if (!isOwner()) return <main className="lab"><p>Not found.</p></main>;

  const choose = (next: 'dark' | 'light') => {
    const look = { ...loadAppearance(), theme: next };
    applyAppearance(look);
    setTheme(next);
  };
  const toggle = () => {
    document.documentElement.classList.toggle('lab-reflect', !prototype);
    setPrototype(!prototype);
  };

  return (
    <main className="lab">
      <h1>Lab</h1>
      <div className="lab-bar">
        <button type="button" className="chip" aria-pressed={theme === 'dark'} onClick={() => choose('dark')}>Dark</button>
        <button type="button" className="chip" aria-pressed={theme === 'light'} onClick={() => choose('light')}>Light</button>
        <button type="button" className="chip" aria-pressed={prototype} onClick={toggle}>Reflection</button>
      </div>

      <section>
        <h2>Cards</h2>
        <div className="card"><strong>A card</strong><span>Plain surface, lit from the upper right.</span></div>
        <div className="card" data-ll-lit><strong>The lit thing</strong><span>What matters now carries the lamp.</span></div>
        <ul className="rows"><li>Grouped row one</li><li>Grouped row two</li><li>Grouped row three</li></ul>
      </section>

      <section>
        <h2>Text boxes</h2>
        <input className="input" aria-label="Text box" defaultValue="A text box" />
        <textarea className="textarea" aria-label="Notes" rows={3} defaultValue="A longer one, for several lines." />
        <input className="input" aria-label="Empty text box" />
      </section>

      <section>
        <h2>Actions</h2>
        <div className="button-row">
          <button type="button" className="button-main">Main</button>
          <button type="button" className="button-quiet">Quiet</button>
        </div>
      </section>

      <section>
        <h2>More cards, for scrolling</h2>
        {FILL.map((n) => <div key={n} className="card lab-fill"><strong>Card {n + 1}</strong></div>)}
      </section>
    </main>
  );
}
