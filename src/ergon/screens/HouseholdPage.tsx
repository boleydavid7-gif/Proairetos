import { useState, useSyncExternalStore } from 'react';
import AccountCard from '../../app/family/AccountCard';
import { offerUndo, say } from '../../app/family/shell';
import { BackIcon } from '../../app/family/icons';
import { syncStatus } from '../../app/sync/syncController';
import type { ErgonNav } from '../app/App';
import { homes, ownChores, sharingAvailable, useChores, useHome } from '../app/state';

const INVITE = 'ergonShared.invite';

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

/** Moves this device's own chores into the shared home. */
function moveOwnInto(list: NonNullable<ReturnType<typeof homes.sharedLists>[number]>): number {
  const own = ownChores.list();
  const there = new Set(homes.sharedItems(list).map((chore) => chore.name.toLowerCase()));
  let moved = 0;
  for (const chore of own) {
    if (!there.has(chore.name.toLowerCase())) {
      homes.changeItem(list, chore.id, chore);
      moved += 1;
    }
    ownChores.remove(chore.id);
  }
  return moved;
}

export default function HouseholdPage({ nav }: { nav: ErgonNav }) {
  const sync = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const home = useHome();
  useChores();
  const own = ownChores.use();
  const [invite, setInvite] = useState(pendingInvite);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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

  const top = (
    <div className="page-top">
      <button type="button" className="back-link" onClick={() => nav.swap({ name: 'more' })}><BackIcon size={18} />More</button>
    </div>
  );

  if (!sharingAvailable) {
    return (
      <div className="page ergon-page">
        {top}
        <h1 className="title">Household</h1>
        <p className="muted">Sharing needs the server, which isn’t set up for this site.</p>
      </div>
    );
  }

  if (invite && invite.id !== home?.id) {
    return (
      <div className="page ergon-page">
        {top}
        <section className="card" aria-label="A home shared with you">
          <span className="card__eyebrow">Shared with you</span>
          <h1 className="card__title">{invite.name}</h1>
          {home && <p className="muted">Joining leaves {home.name} on this device.</p>}
          {signedIn ? (
            <div className="button-row">
              <button
                type="button"
                className="button-main"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    if (home) await homes.leaveList(home);
                    const joined = await homes.joinList(invite);
                    dropInvite();
                    setInvite(undefined);
                    await homes.refreshList(joined);
                  })
                }
              >
                Join
              </button>
              <button type="button" className="button-quiet" onClick={() => { dropInvite(); setInvite(undefined); }}>Not now</button>
            </div>
          ) : (
            <>
              <p className="muted">Sign in to join.</p>
              <AccountCard app="Ergon" what="Your chores" waiting="Chores" />
            </>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>
      </div>
    );
  }

  if (!home) {
    return (
      <div className="page ergon-page">
        {top}
        <h1 className="title">Family</h1>
        <section className="card">
          <h2 className="card__title card__title--small">Connect Ergon to your family</h2>
          <p className="muted">Create your household in Proairetos, then turn on Chores under Settings → Family → What you share. Your personal chores stay private until you add them to the shared home.</p>
          <a className="button-main" href="/?open=settings:household">Open Family settings</a>
          {!signedIn && <AccountCard app="Ergon" what="Your chores" waiting="Chores" />}
        </section>
      </div>
    );
  }

  return (
    <div className="page ergon-page">
      {top}
      <h1 className="title">{home.name}</h1>
      <section className="card">
        <p className="muted">This shared chores list is connected to Ergon. Family membership and which app lists are shared are managed centrally in Proairetos.</p>
        <a className="button-main" href="/?open=settings:household">Manage family settings</a>
      </section>

      {own.length > 0 && (
        <section className="card">
          <p className="muted">{own.length === 1 ? 'One chore is still only on this device.' : `${own.length} chores are still only on this device.`}</p>
          <button
            type="button"
            className="button-quiet"
            onClick={() => {
              const before = ownChores.list();
              const moved = moveOwnInto(home);
              offerUndo(moved === 1 ? 'One chore moved in' : `${moved} chores moved in`, () => {
                for (const chore of before) {
                  ownChores.put(chore);
                  homes.changeItem(home, chore.id, null);
                }
              });
            }}
          >
            Add them to {home.name}
          </button>
        </section>
      )}


      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
