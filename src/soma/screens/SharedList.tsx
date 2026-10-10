import { useEffect, useState, useSyncExternalStore } from 'react';
import { tap } from '../../app/feel';
import AccountCard from '../../app/family/AccountCard';
import { syncStatus } from '../../app/sync/syncController';
import { newId, useSettings } from '../app/state';
import { Segmented, useUndo } from '../app/ui';
import { ShareIcon } from '../app/icons';
import { addToList, byAisle, onList, type GroceryItem } from '../core/groceries';
import { asGrocery, inviteLink, toShared, type SharedItem, type SharedList } from '../core/sharedList';
import { convertAmountText } from '../core/ingredients';
import { loadSettings } from '../data/store';
import { changeItem, createList, joinList, leaveList, refreshList, sharedItems, sharedLists, sharedVersion, subscribeShared } from '../data/sharedLists';

const INVITE = 'somaShared.invite';

/** An invite opened from a link, kept until joined or set aside. */
export function pendingInvite(): { id: string; key: string; name: string } | undefined {
  try {
    const raw = sessionStorage.getItem(INVITE);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}
export function keepInvite(invite: { id: string; key: string; name: string }): void {
  try {
    sessionStorage.setItem(INVITE, JSON.stringify(invite));
  } catch {
    // Without session storage the link can be opened again.
  }
}
const dropInvite = () => {
  try {
    sessionStorage.removeItem(INVITE);
  } catch {
    // Nothing kept.
  }
};

const problem = (cause: unknown) => (cause instanceof Error ? cause.message : 'That did not go through. Try again.');

/** A grocery list shared with someone: both can add, tick and remove; it catches up every few seconds. */
export function SharedLists({ personal }: { personal: GroceryItem[] }) {
  useSyncExternalStore(subscribeShared, sharedVersion);
  const sync = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const lists = sharedLists();
  const [chosen, setChosen] = useState<string>();
  const [invite, setInvite] = useState(pendingInvite);
  const [error, setError] = useState('');
  const [name, setName] = useState('Groceries');
  const [busy, setBusy] = useState(false);
  const signedIn = sync.phase !== 'signed-out' && sync.phase !== 'unavailable';
  const list = lists.find((each) => each.id === chosen) ?? lists[0];

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      setError(problem(cause));
    } finally {
      setBusy(false);
    }
  };

  if (invite && !lists.some((each) => each.id === invite.id)) {
    return (
      <section className="card" aria-label="A list shared with you">
        <span className="card__eyebrow">Shared with you</span>
        <h2 className="card__title">{invite.name}</h2>
        {signedIn ? (
          <div className="button-row">
            <button
              type="button"
              className="button-main"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const joined = await joinList(invite);
                  dropInvite();
                  setInvite(undefined);
                  setChosen(joined.id);
                  await refreshList(joined);
                })
              }
            >
              Join the list
            </button>
            <button type="button" className="button-quiet" onClick={() => { dropInvite(); setInvite(undefined); }}>
              Not now
            </button>
          </div>
        ) : (
          <>
            <p className="muted">Sign in to join.</p>
            <AccountCard app="SOMA" what="Your recipes and grocery list" waiting="Recipes" />
          </>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    );
  }

  if (!list) {
    return (
      <section className="card" aria-label="Share a list">
        <h2 className="card__title">Share a list</h2>
        <p className="muted">Anyone with the link can add, tick and remove. It’s encrypted end to end.</p>
        {signedIn ? (
          <form
            className="field"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => setChosen((await createList(name)).id));
            }}
          >
            <span className="label">Its name</span>
            <input className="input" aria-label="Name of the shared list" value={name} onChange={(event) => setName(event.target.value)} />
            <button type="submit" className="button-main" disabled={busy || !name.trim()}>
              Make a shared list
            </button>
          </form>
        ) : (
          <AccountCard app="SOMA" what="Your recipes and grocery list" waiting="Recipes" />
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    );
  }

  return (
    <>
      {lists.length > 1 && (
        <Segmented label="Shared lists" value={list.id} options={lists.map((each) => ({ id: each.id, label: each.name }))} onChange={setChosen} small />
      )}
      <OneList key={list.id} list={list} personal={personal} onLeft={() => setChosen(undefined)} />
    </>
  );
}

function OneList({ list, personal, onLeft }: { list: SharedList; personal: GroceryItem[]; onLeft: () => void }) {
  useSyncExternalStore(subscribeShared, sharedVersion);
  const settings = useSettings();
  const undo = useUndo();
  const [adding, setAdding] = useState('');
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const items = sharedItems(list).map(asGrocery);

  useEffect(() => {
    const pull = () => {
      if (document.visibilityState === 'visible') void refreshList(list).then(() => setError(''), (cause) => setError(problem(cause)));
    };
    pull();
    const timer = window.setInterval(pull, 15_000);
    document.addEventListener('visibilitychange', pull);
    window.addEventListener('online', pull);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', pull);
      window.removeEventListener('online', pull);
    };
  }, [list]);

  const put = (item: SharedItem | null, id: string) => changeItem(list, id, item);
  const add = (lines: { line: string }[]) => {
    const before = items;
    const after = addToList(items, lines, loadSettings().aisleChoices, new Date().toISOString(), newId);
    for (const item of after) {
      const old = before.find((each) => each.id === item.id);
      if (!old || JSON.stringify(old) !== JSON.stringify(item)) put(toShared(item), item.id);
    }
  };
  const toggle = (item: GroceryItem) => {
    if (!item.checked) tap();
    put(toShared({ ...item, checked: !item.checked }), item.id);
  };
  const remove = (item: GroceryItem) => {
    put(null, item.id);
    undo(`${item.name} removed`, () => put(toShared(item), item.id));
  };
  const clearTicked = () => {
    const ticked = items.filter((item) => item.checked);
    for (const item of ticked) put(null, item.id);
    undo(ticked.length === 1 ? 'Ticked item cleared' : `${ticked.length} ticked cleared`, () => ticked.forEach((item) => put(toShared(item), item.id)));
  };
  const mine = personal.filter((item) => onList(item) && !item.checked && !items.some((each) => each.name.toLowerCase() === item.name.toLowerCase()));
  const invite = async () => {
    const link = inviteLink(location.origin, list);
    try {
      if (navigator.share) await navigator.share({ title: list.name, text: `Our grocery list in SOMA: ${link}` });
      else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      }
    } catch {
      // Closed without sharing.
    }
  };

  return (
    <>
      <form
        className="add-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!adding.trim()) return;
          add([{ line: adding.trim() }]);
          setAdding('');
        }}
      >
        <input className="input" aria-label={`Add to ${list.name}`} placeholder="Add something: 2 lemons" value={adding} onChange={(event) => setAdding(event.target.value)} />
        <button type="submit" className="button-quiet" disabled={!adding.trim()}>
          Add
        </button>
      </form>
      {mine.length > 0 && (
        <button type="button" className="button-quiet" onClick={() => add(mine.map((item) => ({ line: [item.amounts.join(' + '), item.name].filter(Boolean).join(' ') })))}>
          Add my list ({mine.length}) to it
        </button>
      )}
      {items.length === 0 ? (
        <p className="muted">Nothing on {list.name} yet.</p>
      ) : (
        byAisle(items.filter((item) => !item.checked)).map(({ aisle, items: group }) => (
          <section key={aisle} className="aisle" aria-label={aisle}>
            <div className="aisle__head"><span>{aisle}</span></div>
            <ul className="check-list">
              {group.map((item) => (
                <SharedRow key={item.id} item={item} units={settings.units} onToggle={() => toggle(item)} onRemove={() => remove(item)} />
              ))}
            </ul>
          </section>
        ))
      )}
      {items.some((item) => item.checked) && (
        <section className="aisle" aria-label="Ticked">
          <div className="aisle__head"><span>Ticked</span></div>
          <ul className="check-list">
            {items.filter((item) => item.checked).map((item) => (
              <SharedRow key={item.id} item={item} units={settings.units} onToggle={() => toggle(item)} onRemove={() => remove(item)} />
            ))}
          </ul>
          <button type="button" className="button-quiet" onClick={clearTicked}>Clear ticked</button>
        </section>
      )}
      {error && <p className="hint" role="status">{error}</p>}
      <button type="button" className="text-link share-link" onClick={() => void invite()}>
        <ShareIcon size={18} /> Invite someone to {list.name}
      </button>
      {copied && <p className="hint" role="status">Link copied. Whoever has it can see and change this list.</p>}
      {leaving ? (
        <div className="button-row">
          <button
            type="button"
            className="button-quiet"
            onClick={() => void leaveList(list).then(onLeft, (cause) => setError(problem(cause)))}
          >
            Leave {list.name}
          </button>
          <button type="button" className="button-quiet" onClick={() => setLeaving(false)}>Keep it</button>
        </div>
      ) : (
        <button type="button" className="text-link" onClick={() => setLeaving(true)}>Leave this list</button>
      )}
    </>
  );
}

function SharedRow({ item, units, onToggle, onRemove }: { item: GroceryItem; units: Parameters<typeof convertAmountText>[2]; onToggle: () => void; onRemove: () => void }) {
  return (
    <li className="grocery-row">
      <button type="button" className="check-row" aria-pressed={item.checked} onClick={onToggle}>
        <span className="check-row__box">{item.checked ? '✓' : ''}</span>
        <span className="check-row__text">
          {item.name}
          {item.amounts.length > 0 && <span className="check-row__amount">{item.amounts.map((amount) => convertAmountText(amount, item.name, units)).join(' + ')}</span>}
        </span>
      </button>
      <button type="button" className="grocery-row__more" aria-label={`Remove ${item.name}`} onClick={onRemove}>
        ×
      </button>
    </li>
  );
}
