import { useState } from 'react';
import type { Nav } from '../app/App';
import { ShareIcon } from '../app/icons';
import { newId, useGroceries } from '../app/state';
import { Brand, Segmented, useUndo } from '../app/ui';
import { aisles, type Aisle } from '../core/aisles';
import { addToList, byAisle, byRecipe, listAsText, type GroceryItem } from '../core/groceries';
import { loadSettings, saveGroceries, saveSettings } from '../data/store';

function Row({ item, onToggle, onMore }: { item: GroceryItem; onToggle: () => void; onMore: () => void }) {
  return (
    <li className="grocery-row">
      <button type="button" className="check-row" aria-pressed={item.checked} onClick={onToggle}>
        <span className="check-row__box">{item.checked ? '✓' : ''}</span>
        <span className="check-row__text">
          {item.name}
          {item.amounts.length > 0 && <span className="check-row__amount">{item.amounts.join(' + ')}</span>}
        </span>
      </button>
      <button type="button" className="grocery-row__more" aria-label={`More for ${item.name}`} onClick={onMore}>
        ⋯
      </button>
    </li>
  );
}

/** The grocery list, sorted by aisle (or by recipe). Ticked things wait at the bottom until cleared. */
export default function GroceriesPage({ nav: _nav }: { nav: Nav }) {
  const items = useGroceries();
  const undo = useUndo();
  const [view, setView] = useState<'aisle' | 'recipe'>('aisle');
  const [adding, setAdding] = useState('');
  const [open, setOpen] = useState<GroceryItem>();
  const [shared, setShared] = useState(false);
  if (!items) return null;

  const change = (next: GroceryItem[], words?: string) => {
    const before = items;
    void saveGroceries(next);
    if (words) undo(words, () => void saveGroceries(before));
  };
  const toggle = (item: GroceryItem) => change(items.map((each) => (each.id === item.id ? { ...each, checked: !each.checked } : each)));
  const ticked = items.filter((item) => item.checked);

  const share = async () => {
    const text = listAsText(items);
    try {
      if (navigator.share) await navigator.share({ title: 'Groceries', text });
      else {
        await navigator.clipboard.writeText(text);
        setShared(true);
      }
    } catch {
      // Closed without sharing.
    }
  };

  return (
    <div className="page">
      <Brand />
      <h1 className="title">Groceries</h1>
      <form
        className="add-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!adding.trim()) return;
          change(addToList(items, [{ line: adding.trim() }], loadSettings().aisleChoices, new Date().toISOString(), newId));
          setAdding('');
        }}
      >
        <input className="input" aria-label="Add something" placeholder="Add something: 2 lemons" value={adding} onChange={(event) => setAdding(event.target.value)} />
        <button type="submit" className="button-quiet" disabled={!adding.trim()}>
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <p className="muted">Nothing on the list. Add things here, or from a recipe’s ingredients.</p>
      ) : (
        <>
          <Segmented
            label="Sort"
            value={view}
            options={[
              { id: 'aisle', label: 'By aisle' },
              { id: 'recipe', label: 'By recipe' },
            ]}
            onChange={setView}
            small
          />
          {(view === 'aisle' ? byAisle(items).map(({ aisle, items: group }) => ({ title: aisle as string, items: group })) : byRecipe(items)).map(
            (group) => (
              <section key={group.title} className="aisle" aria-label={group.title}>
                <div className="aisle__head">
                  <span>{group.title}</span>
                </div>
                <ul className="check-list">
                  {group.items.map((item) => (
                    <Row key={`${group.title}-${item.id}`} item={item} onToggle={() => toggle(item)} onMore={() => setOpen(item)} />
                  ))}
                </ul>
              </section>
            ),
          )}
          <div className="button-row" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="button-quiet"
              disabled={ticked.length === 0}
              onClick={() => change(items.filter((item) => !item.checked), 'Ticked items cleared')}
            >
              Clear ticked
            </button>
            <button type="button" className="button-quiet" onClick={() => void share()}>
              <ShareIcon size={18} /> Share
            </button>
          </div>
          {shared && (
            <p className="hint" role="status">
              Copied, ready to paste.
            </p>
          )}
        </>
      )}

      {open && (
        <div className="sheet-back" onClick={() => setOpen(undefined)}>
          <div className="sheet" role="dialog" aria-label={open.name} onClick={(event) => event.stopPropagation()}>
            <h2 className="sheet__title">{open.name}</h2>
            {open.from.length > 0 && <p className="muted">For {open.from.map((each) => each.title).join(', ')}</p>}
            <span className="label">Aisle</span>
            <div className="chip-grid" role="group" aria-label="Aisle">
              {aisles.map((aisle: Aisle) => (
                <button
                  key={aisle}
                  type="button"
                  className="chip"
                  aria-pressed={open.aisle === aisle}
                  onClick={() => {
                    // Remembered for next time this item comes along.
                    const settings = loadSettings();
                    saveSettings({ ...settings, aisleChoices: { ...settings.aisleChoices, [open.name.toLowerCase()]: aisle } });
                    change(items.map((each) => (each.id === open.id ? { ...each, aisle } : each)));
                    setOpen(undefined);
                  }}
                >
                  {aisle}
                </button>
              ))}
            </div>
            <div className="button-row">
              <button
                type="button"
                className="button-quiet"
                onClick={() => {
                  change(
                    items.filter((each) => each.id !== open.id),
                    `${open.name} removed`,
                  );
                  setOpen(undefined);
                }}
              >
                Remove
              </button>
              <button
                type="button"
                className="button-quiet"
                onClick={() => {
                  const settings = loadSettings();
                  if (!settings.usuallyHave.includes(open.name.toLowerCase()))
                    saveSettings({ ...settings, usuallyHave: [...settings.usuallyHave, open.name.toLowerCase()] });
                  setOpen(undefined);
                }}
              >
                I usually have this
              </button>
            </div>
            <button type="button" className="button-quiet" onClick={() => setOpen(undefined)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
