import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { tap } from '../../app/feel';
import { syncStatus } from '../../app/sync/syncController';
import { displayName } from '../../data/storage/preferences';
import { dropInvite, newId, pendingInvite, sharingAvailable, togetherLists, useTogether } from '../../app/together/together';
import { arrange, type SharedTodo } from '../../core/together/sharedTodos';
import { Empty, offerUndo } from '../../app/family/shell';
import { ListIcon, PlusIcon } from '../../app/family/icons';
import type { ErgonNav } from '../app/App';
import { TodoList } from '../app/ui';
import { useListPermissions } from '../../app/family/sharedLists';

const problem = (cause: unknown) => (cause instanceof Error ? cause.message : 'That didn’t go through. Try again.');

function JoinCard({ invite, onDone }: { invite: { id: string; key: string; name: string }; onDone: () => void }) {
  const sync = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = togetherLists.sharedLists()[0];
  const signedIn = sync.phase !== 'signed-out' && sync.phase !== 'unavailable';

  if (!signedIn) {
    return (
      <section className="card" aria-label="A list shared with you">
        <p className="section-label">Shared with you</p>
        <h2 className="card__title">{invite.name}</h2>
        <p className="muted">Sign in to join this shared to-do list.</p>
        <a className="button-main" href="/?open=account">Sign in</a>
        <button type="button" className="button-quiet" onClick={() => { dropInvite(); onDone(); }}>Not now</button>
      </section>
    );
  }

  return (
    <section className="card" aria-label="A list shared with you">
      <p className="section-label">Shared with you</p>
      <h2 className="card__title">{invite.name}</h2>
      {current && current.id !== invite.id && <p className="muted">Joining leaves {current.name} on this device.</p>}
      <div className="button-row">
        <button
          type="button"
          className="button-main"
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
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}

export default function TodosPage({ nav: _nav }: { nav: ErgonNav }) {
  const sync = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const { list, todos } = useTogether();
  const can = useListPermissions(list?.id);
  const [invite, setInvite] = useState(pendingInvite);
  const [text, setText] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const signedIn = sync.phase !== 'signed-out' && sync.phase !== 'unavailable';
  const { open, done } = list ? arrange(todos, new Date()) : { open: [], done: [] };

  if (invite && invite.id !== list?.id) return <div className="page ergon-page"><div className="page-top"><h1 className="title">To-dos</h1></div><JoinCard invite={invite} onDone={() => setInvite(undefined)} /></div>;

  const focusAdd = () => {
    setShowAdd(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!list) return;
    const title = text.trim();
    if (!title) return;
    const by = displayName().trim() || undefined;
    const id = newId();
    togetherLists.changeItem(list, id, { id, title, by, createdAt: new Date().toISOString() });
    setText('');
    setShowAdd(false);
  };

  const toggle = (todo: SharedTodo) => {
    if (!list) return;
    const me = displayName().trim() || undefined;
    const next = todo.doneAt ? { ...todo, doneAt: undefined, doneBy: undefined } : { ...todo, doneAt: new Date().toISOString(), doneBy: me };
    if (!todo.doneAt) tap();
    togetherLists.changeItem(list, todo.id, next);
    if (!todo.doneAt) offerUndo(`“${todo.title}” done`, async () => togetherLists.changeItem(list, todo.id, todo));
  };

  const remove = (todo: SharedTodo) => {
    if (!list) return;
    togetherLists.changeItem(list, todo.id, null);
    offerUndo(`“${todo.title}” removed`, async () => togetherLists.changeItem(list, todo.id, todo));
  };

  return (
    <div className="page ergon-page">
      <div className="page-top section-head">
        <h1 className="title">To-dos</h1>
        {list && can.write && <button type="button" className="button-main" onClick={focusAdd}><PlusIcon size={18} />Add</button>}
      </div>

      {!sharingAvailable ? (
        <section className="card"><h2 className="card__title">Sharing is unavailable</h2><p className="muted">Connect the server before making a shared family list.</p></section>
      ) : !list && !signedIn ? (
        <section className="card"><h2 className="card__title">Share to-dos with family</h2><a className="button-main" href="/?open=account">Sign in</a></section>
      ) : !list ? (
        <section className="card">
          <h2 className="card__title">No shared to-dos yet</h2>
          <a className="button-main" href="/?open=settings:household">Set up in Family</a>
        </section>
      ) : (
        <>
          {showAdd && (
            <form className="add-line" onSubmit={add}>
              <input ref={inputRef} className="input" aria-label={`Add to ${list.name}`} value={text} onChange={(event) => setText(event.target.value)} />
              <button type="submit" className="button-quiet" disabled={!text.trim()}>Add</button>
              <button type="button" className="text-link" onClick={() => { setShowAdd(false); setText(''); }}>Cancel</button>
            </form>
          )}
          {open.length === 0 ? (
            <Empty icon={<ListIcon size={28} />} title="No active to-dos" />
          ) : (
            <section className="chore-group">
              <p className="label">{list.name}</p>
              <TodoList todos={open} canTick={can.write} canRemove={can.remove} onToggle={toggle} onRemove={remove} />
            </section>
          )}
          {done.length > 0 && (
            <section className="chore-group">
              <button type="button" className="text-link" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>Done ({done.length})</button>
              {showDone && <TodoList todos={done} canTick={can.write} canRemove={can.remove} onToggle={toggle} onRemove={remove} />}
            </section>
          )}
        </>
      )}
    </div>
  );
}
