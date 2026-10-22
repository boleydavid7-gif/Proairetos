import { useState, useSyncExternalStore } from 'react';
import { lifeService } from '../../app/services';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { syncStatus } from '../../app/sync/syncController';
import { dropInvite, pendingInvite, sharingAvailable, togetherLists, useTogether } from '../../app/together/together';
import { inviteLink, type SharedTodo } from '../../core/together/sharedTodos';

const problem = (cause: unknown) => (cause instanceof Error ? cause.message : 'That didn’t go through. Try again.');

/**
 * Settings > Shared list: one to-do list kept with the people at home. Everyone with the invite link adds, ticks and
 * removes; each line is encrypted on the device with the list's own key, which travels only in the link.
 */
export default function TogetherSection({ onOpenAccount }: { onOpenAccount: () => void }) {
  const { offerUndo } = useOverlays();
  const sync = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const { list, todos } = useTogether();
  const [invite, setInvite] = useState(pendingInvite);
  const [name, setName] = useState('Home');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const signedIn = sync.phase !== 'signed-out' && sync.phase !== 'unavailable';

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

  if (!sharingAvailable) {
    return (
      <section className="settings-card">
        <p className="section-description">Sharing needs the server, which isn’t set up for this site.</p>
      </section>
    );
  }

  if (!signedIn) {
    return (
      <section className="settings-card">
        <p className="section-description">A to-do list for the people at home: anyone on it adds and ticks things off. Sign in first.</p>
        <button type="button" className="button-accent account-wide" onClick={onOpenAccount}>Account and sync</button>
      </section>
    );
  }

  if (invite && invite.id !== list?.id) {
    return (
      <section className="settings-card" aria-label="A list shared with you">
        <p className="section-description">{invite.name} was shared with you.{list ? ` Joining leaves ${list.name} on this device.` : ''}</p>
        <div className="button-row">
          <button
            type="button"
            className="button-accent"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (list) await togetherLists.leaveList(list);
                const joined = await togetherLists.joinList(invite);
                dropInvite();
                setInvite(undefined);
                await togetherLists.refreshList(joined);
              })
            }
          >
            Join
          </button>
          <button type="button" className="button-quiet" onClick={() => { dropInvite(); setInvite(undefined); }}>Not now</button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    );
  }

  if (!list) {
    return (
      <section className="settings-card">
        <p className="section-description">A to-do list for the people at home. It shows on Today for everyone on it; anyone adds and ticks things off. Encrypted end to end.</p>
        <form
          className="field"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await togetherLists.createList(name);
            });
          }}
        >
          <span className="field__label">Name</span>
          <input className="input" aria-label="Name of the list" value={name} onChange={(event) => setName(event.target.value)} />
          <button type="submit" className="button-accent account-wide" disabled={busy || !name.trim()}>Make the list</button>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    );
  }

  const share = async () => {
    const link = inviteLink(location.origin, list);
    try {
      if (navigator.share) await navigator.share({ title: list.name, text: `Our list in Proairetos: ${link}` });
      else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      }
    } catch {
      // Closed without sharing.
    }
  };

  return (
    <div className="settings-sections">
      <section className="settings-card">
        <p className="section-description">{list.name} shows on Today. Anyone with the invite link can join.</p>
        <button type="button" className="button-accent account-wide" onClick={() => void share()}>Invite</button>
        {copied && <p className="hint" role="status">Link copied.</p>}
      </section>
      {leaving ? (
        <section className="settings-card">
          <p className="section-description">Leave {list.name}? The others keep the list; its open to-dos are kept here as your own.</p>
          <div className="button-row">
            <button type="button" className="button-quiet" onClick={() => setLeaving(false)}>Cancel</button>
            <button
              type="button"
              className="button-danger"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  // The open ones come along as this person's own to-dos, so nothing is lost by leaving.
                  const open = todos.filter((todo: SharedTodo) => !todo.doneAt);
                  const kept: { id: string }[] = [];
                  for (const todo of open) kept.push(await lifeService.add(todo.title, 'TODO'));
                  await togetherLists.leaveList(list);
                  setLeaving(false);
                  if (kept.length)
                    offerUndo(kept.length === 1 ? 'One to-do kept' : `${kept.length} to-dos kept`, async () => {
                      for (const item of kept) await lifeService.deleteItem(item.id);
                    });
                })
              }
            >
              Leave
            </button>
          </div>
        </section>
      ) : (
        <button type="button" className="text-link remove-link" onClick={() => setLeaving(true)}>Leave {list.name}</button>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
