import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { tap } from '../../app/feel';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { useNavigate } from '../../app/navigationContext';
import { syncStatus } from '../../app/sync/syncController';
import { dropInvite, newId, pendingInvite, togetherLists, useTogether } from '../../app/together/together';
import { arrange, type SharedTodo } from '../../core/together/sharedTodos';
import { displayName } from '../../data/storage/preferences';
import { openSettingsAt } from '../settings/settingsViews';
import { Sym } from '../../lamplight/icons';
import { CheckIcon } from '../../components/icons/Icons';

const problem = (cause: unknown) => (cause instanceof Error ? cause.message : 'Couldn’t join. Try again.');

/** An invite opened from a link: join from Today, or set it aside. */
function JoinCard({ invite, onDone }: { invite: { id: string; key: string; name: string }; onDone: () => void }) {
  const sync = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const navigate = useNavigate();
  const signedIn = sync.phase !== 'signed-out' && sync.phase !== 'unavailable';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = togetherLists.sharedLists()[0];
  return (
    <section className="card together-join" aria-label="A list shared with you">
      <p className="section-label">Shared with you</p>
      <h2 className="card__title">{invite.name}</h2>
      {current && current.id !== invite.id && <p className="muted">Joining leaves {current.name} on this device.</p>}
      {signedIn ? (
        <div className="button-row">
          <button
            type="button"
            className="button-accent"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                if (current && current.id !== invite.id) await togetherLists.leaveList(current);
                const joined = await togetherLists.joinList(invite);
                dropInvite();
                onDone();
                await togetherLists.refreshList(joined);
              } catch (cause) {
                setError(problem(cause));
              } finally {
                setBusy(false);
              }
            }}
          >
            Join
          </button>
          <button type="button" className="button-quiet" onClick={() => { dropInvite(); onDone(); }}>Not now</button>
        </div>
      ) : (
        <div className="button-row">
          <button type="button" className="button-accent" onClick={() => { openSettingsAt('account'); navigate('settings'); }}>Sign in to join</button>
          <button type="button" className="button-quiet" onClick={() => { dropInvite(); onDone(); }}>Not now</button>
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}

function Row({ todo, onToggle, onRemove }: { todo: SharedTodo; onToggle: () => void; onRemove: () => void }) {
  const done = Boolean(todo.doneAt);
  const who = done ? todo.doneBy : todo.by;
  return (
    <li className={`check-row together__row${done ? ' check-row--done' : ''}`}>
      <button type="button" role="checkbox" aria-checked={done} aria-label={todo.title} className="check-row__box" data-menu-first onClick={onToggle}>
        {done && <CheckIcon size={16} />}
      </button>
      <span className="check-row__title">
        <span>{todo.title}</span>
        {who && <span className="check-row__detail">{done ? `Done by ${who}` : who}</span>}
      </span>
      <button type="button" className="check-row__delete" aria-label={`Remove ${todo.title}`} onClick={onRemove}>
        <Sym name="close" />
      </button>
    </li>
  );
}

/**
 * Today's shared list: the to-dos the household keeps together. Anyone on the list adds, ticks and removes; each
 * change goes to the others sealed. Shown once there is a list (Settings > Shared list), or an invite to one.
 */
export default function TodayTogether() {
  const { offerUndo } = useOverlays();
  const navigate = useNavigate();
  const { list, todos } = useTogether();
  const [invite, setInvite] = useState(pendingInvite);
  const [text, setText] = useState('');
  const [showDone, setShowDone] = useState(false);

  if (invite && invite.id !== list?.id) return <JoinCard invite={invite} onDone={() => setInvite(undefined)} />;
  if (!list) return null;

  const { open, done } = arrange(todos, new Date());
  const me = displayName() || undefined;

  const add = (event: FormEvent) => {
    event.preventDefault();
    const title = text.trim();
    if (!title) return;
    const todo: SharedTodo = { id: newId(), title, by: me, createdAt: new Date().toISOString() };
    togetherLists.changeItem(list, todo.id, todo);
    setText('');
  };
  const toggle = (todo: SharedTodo) => {
    const next: SharedTodo = todo.doneAt ? { ...todo, doneAt: undefined, doneBy: undefined } : { ...todo, doneAt: new Date().toISOString(), doneBy: me };
    if (!todo.doneAt) tap();
    togetherLists.changeItem(list, todo.id, next);
    if (!todo.doneAt) offerUndo(`“${todo.title}” done`, async () => togetherLists.changeItem(list, todo.id, todo));
  };
  const remove = (todo: SharedTodo) => {
    togetherLists.changeItem(list, todo.id, null);
    offerUndo(`“${todo.title}” removed`, async () => togetherLists.changeItem(list, todo.id, todo));
  };

  return (
    <section className="today-section together" aria-label={list.name}>
      <div className="section-heading">
        <h2 className="section-label">{list.name}</h2>
        <span className="section-heading__actions">
          <button type="button" className="text-link" onClick={() => { openSettingsAt('together'); navigate('settings'); }}>
            Share
          </button>
        </span>
      </div>
      {open.length > 0 && (
        <ul className="check-list">
          {open.map((todo) => <Row key={todo.id} todo={todo} onToggle={() => toggle(todo)} onRemove={() => remove(todo)} />)}
        </ul>
      )}
      <form className="together__add" onSubmit={add}>
        <input className="input" aria-label={`Add to ${list.name}`} value={text} onChange={(event) => setText(event.target.value)} />
        {text.trim() && <button type="submit" className="button-quiet">Add</button>}
      </form>
      {done.length > 0 && (
        <>
          <button type="button" className="text-link together__done-toggle" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>
            Done ({done.length})
          </button>
          {showDone && (
            <ul className="check-list">
              {done.map((todo) => <Row key={todo.id} todo={todo} onToggle={() => toggle(todo)} onRemove={() => remove(todo)} />)}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
