import { useState, useSyncExternalStore } from 'react';
import AccountCard from '../../app/family/AccountCard';
import { offerUndo, say } from '../../app/family/shell';
import { BackIcon, ShareIcon } from '../../app/family/icons';
import { syncStatus } from '../../app/sync/syncController';
import type { PhytonNav } from '../app/App';
import { homes, ownPlants, sharingAvailable, usePlants, useHome } from '../app/state';
import { inviteLink } from '../core/invite';

const INVITE = 'phytonShared.invite';

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

/** Moves this device's own plants into the shared home. */
function moveOwnInto(list: NonNullable<ReturnType<typeof homes.sharedLists>[number]>): number {
  const own = ownPlants.list();
  const there = new Set(homes.sharedItems(list).map((plant) => plant.name.toLowerCase()));
  let moved = 0;
  for (const plant of own) {
    if (!there.has(plant.name.toLowerCase())) {
      homes.changeItem(list, plant.id, plant);
      moved += 1;
    }
    ownPlants.remove(plant.id);
  }
  return moved;
}

export default function HomePage({ nav }: { nav: PhytonNav }) {
  const sync = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const home = useHome();
  usePlants();
  const own = ownPlants.use();
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

  const top = (
    <div className="page-top">
      <button type="button" className="back-link" onClick={() => nav.swap({ name: 'more' })}><BackIcon size={18} />More</button>
    </div>
  );

  if (!sharingAvailable) {
    return (
      <div className="page phyton-page">
        {top}
        <h1 className="title">Share your plants</h1>
        <p className="muted">Sharing needs the server, which isn’t set up for this site.</p>
      </div>
    );
  }

  if (invite && invite.id !== home?.id) {
    return (
      <div className="page phyton-page">
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
              <AccountCard app="Phyton" what="Your plants" waiting="Plants" />
            </>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>
      </div>
    );
  }

  if (!home) {
    return (
      <div className="page phyton-page">
        {top}
        <h1 className="title">Share your plants</h1>
        <section className="card">
          <h2 className="card__title card__title--small">Share with the people you live with</h2>
          <p className="muted">Everyone with the link sees the same plants and can mark them watered. Encrypted end to end.</p>
          {signedIn ? (
            <form
              className="field"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  const list = await homes.createList(name);
                  const moved = moveOwnInto(list);
                  if (moved) say(moved === 1 ? 'One plant moved in' : `${moved} plants moved in`);
                });
              }}
            >
              <span className="field__label">Name</span>
              <input className="input" aria-label="Name of the home" value={name} onChange={(event) => setName(event.target.value)} />
              <button type="submit" className="button-main" disabled={busy || !name.trim()}>Share</button>
            </form>
          ) : (
            <AccountCard app="Phyton" what="Your plants" waiting="Plants" />
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>
      </div>
    );
  }

  const share = async () => {
    const link = inviteLink(location.origin, home);
    try {
      if (navigator.share) await navigator.share({ title: home.name, text: `Our plants in Phyton: ${link}` });
      else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      }
    } catch {
      // Closed without sharing.
    }
  };

  return (
    <div className="page phyton-page">
      {top}
      <h1 className="title">{home.name}</h1>
      <section className="card">
        <p className="muted">Anyone with the invite link can join. Each plant is encrypted on the device before it’s sent.</p>
        <button type="button" className="button-main" onClick={() => void share()}><ShareIcon size={18} />Invite</button>
        {copied && <p className="hint" role="status">Link copied.</p>}
      </section>

      {own.length > 0 && (
        <section className="card">
          <p className="muted">{own.length === 1 ? 'One plant is still only on this device.' : `${own.length} plants are still only on this device.`}</p>
          <button
            type="button"
            className="button-quiet"
            onClick={() => {
              const before = ownPlants.list();
              const moved = moveOwnInto(home);
              offerUndo(moved === 1 ? 'One plant moved in' : `${moved} plants moved in`, () => {
                for (const plant of before) {
                  ownPlants.put(plant);
                  homes.changeItem(home, plant.id, null);
                }
              });
            }}
          >
            Add them to {home.name}
          </button>
        </section>
      )}

      {leaving ? (
        <section className="card">
          <p>Leave {home.name}? The plants stay with the others.</p>
          <div className="button-row">
            <button type="button" className="button-quiet" onClick={() => setLeaving(false)}>Cancel</button>
            <button
              type="button"
              className="button-danger"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  // Keep a copy of the plants on this device.
                  for (const plant of homes.sharedItems(home)) ownPlants.put(plant);
                  await homes.leaveList(home);
                  setLeaving(false);
                })
              }
            >
              Leave
            </button>
          </div>
        </section>
      ) : (
        <button type="button" className="text-link remove-link" onClick={() => setLeaving(true)}>Leave {home.name}</button>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
