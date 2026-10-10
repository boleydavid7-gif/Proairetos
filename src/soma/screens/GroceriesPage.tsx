import { tap } from '../../app/feel';
import { useState } from 'react';
import type { Nav } from '../app/App';
import { ShareIcon } from '../app/icons';
import { newId, useGroceries, useSettings, useToday } from '../app/state';
import { Brand, Segmented, useUndo } from '../app/ui';
import { aisles, type Aisle } from '../core/aisles';
import { addToList, byAisle, byRecipe, cleanLine, isGrocery, listAsText, onList, type GroceryItem } from '../core/groceries';
import { boughtLabel, bringHome, kitchenByAge } from '../core/kitchen';
import { convertAmountText, type UnitSystem } from '../core/ingredients';
import { loadSettings, saveGroceries, saveSettings } from '../data/store';
import { pendingInvite, SharedLists } from './SharedList';
import { sharingAvailable } from '../data/sharedLists';

function Row({ item, unitSystem, onToggle, onMore }: { item: GroceryItem; unitSystem: UnitSystem; onToggle: () => void; onMore: () => void }) {
  return (
    <li className="grocery-row">
      <button type="button" className="check-row" aria-pressed={item.checked} onClick={onToggle}>
        <span className="check-row__box">{item.checked ? '✓' : ''}</span>
        <span className="check-row__text">
          {item.name}
          {item.amounts.length > 0 && <span className="check-row__amount">{item.amounts.map((amount) => convertAmountText(amount, item.name, unitSystem)).join(' + ')}</span>}
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
  const settings = useSettings();
  const undo = useUndo();
  const [view, setView] = useState<'aisle' | 'recipe'>('aisle');
  const [adding, setAdding] = useState('');
  const [open, setOpen] = useState<GroceryItem>();
  const [shared, setShared] = useState(false);
  const [place, setPlace] = useState<'list' | 'kitchen' | 'shared'>(() => (pendingInvite() ? 'shared' : 'list'));
  const today = useToday();
  if (!items) return null;

  const change = (next: GroceryItem[], words?: string) => {
    const before = items;
    void saveGroceries(next);
    if (words) undo(words, () => void saveGroceries(before));
  };
  const toggle = (item: GroceryItem) => {
    if (!item.checked) tap();
    change(items.map((each) => (each.id === item.id ? { ...each, checked: !each.checked } : each)));
  };
  const ticked = items.filter((item) => item.checked && onList(item));
  const toBuy = items.filter(onList);
  // Lines saved before the list learned to tell groceries from notes: still there until tidied.
  const untidy = toBuy.filter((item) => !isGrocery(item.name) || cleanLine(item.name) !== item.name);
  const tidy = () =>
    change(
      items.flatMap((item) => {
        if (!onList(item) || (isGrocery(item.name) && cleanLine(item.name) === item.name)) return [item];
        return isGrocery(item.name) ? [{ ...item, name: cleanLine(item.name) }] : [];
      }),
      'List tidied',
    );

  const share = async () => {
    const text = listAsText(items, settings.units);
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
      <Segmented
        label="Groceries"
        value={place}
        options={[
          { id: 'list', label: 'To buy' },
          { id: 'kitchen', label: 'In the kitchen' },
          ...(sharingAvailable ? [{ id: 'shared' as const, label: 'Shared' }] : []),
        ]}
        onChange={setPlace}
      />
      {place === 'shared' ? (
        <SharedLists personal={items} />
      ) : place === 'kitchen' ? (
        <Kitchen items={items} today={today} change={change} />
      ) : (
      <>
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

      {untidy.length > 0 && (
        <button type="button" className="button-quiet" onClick={tidy}>
          Tidy the list ({untidy.length} {untidy.length === 1 ? 'line is' : 'lines are'} a note or numbered)
        </button>
      )}

      {toBuy.length === 0 ? (
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
                    <Row key={`${group.title}-${item.id}`} item={item} unitSystem={settings.units} onToggle={() => toggle(item)} onMore={() => setOpen(item)} />
                  ))}
                </ul>
              </section>
            ),
          )}
          {ticked.length > 0 && (
            <div className="ticked-bar" role="group" aria-label="Ticked">
              <span className="ticked-bar__count">{ticked.length} ticked</span>
              <button
                type="button"
                className="button-main"
                onClick={() => change(bringHome(items, today), ticked.length === 1 ? 'Put away in the kitchen' : `${ticked.length} put away in the kitchen`)}
              >
                Put away
              </button>
              <button
                type="button"
                className="button-quiet"
                onClick={() => change(items.filter((item) => !(item.checked && onList(item))), 'Ticked items cleared')}
              >
                Clear
              </button>
            </div>
          )}
          <button type="button" className="text-link share-link" onClick={() => void share()}>
            <ShareIcon size={18} /> Share the list
          </button>
          {shared && (
            <p className="hint" role="status">
              Copied, ready to paste.
            </p>
          )}
        </>
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

/** What is at home: added by hand or put away from the list; the longest there first, each with a plain fact. */
function Kitchen({ items, today, change }: { items: GroceryItem[]; today: string; change: (next: GroceryItem[], words?: string) => void }) {
  const [adding, setAdding] = useState('');
  const here = kitchenByAge(items);
  return (
    <>
      <form
        className="add-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!adding.trim()) return;
          const added = addToList([], [{ line: adding.trim() }], loadSettings().aisleChoices, new Date().toISOString(), newId).map((item) => ({
            ...item,
            place: 'kitchen' as const,
            boughtAt: today,
          }));
          change([...items, ...added]);
          setAdding('');
        }}
      >
        <input className="input" aria-label="Add to the kitchen" placeholder="Something at home: rice" value={adding} onChange={(event) => setAdding(event.target.value)} />
        <button type="submit" className="button-quiet" disabled={!adding.trim()}>
          Add
        </button>
      </form>
      {here.length === 0 ? (
        <p className="muted">Ticked groceries come here with Put away.</p>
      ) : (
        <ul className="check-list">
          {here.map((item) => (
            <li key={item.id} className="grocery-row">
              <span className="check-row">
                <span className="check-row__text">
                  {item.name}
                  <span className="check-row__amount">{boughtLabel(item.boughtAt, today)}</span>
                </span>
              </span>
              <button type="button" className="text-link" onClick={() => change(items.filter((each) => each.id !== item.id), `${item.name} used up`)}>
                Used up
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
