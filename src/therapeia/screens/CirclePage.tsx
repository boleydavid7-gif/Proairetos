import { useState, useSyncExternalStore } from 'react';
import AccountCard from '../../app/family/AccountCard';
import { offerUndo, say } from '../../app/family/shell';
import { BackIcon, ShareIcon } from '../../app/family/icons';
import { syncStatus } from '../../app/sync/syncController';
import type { TherapeiaNav } from '../app/App';
import { circles, medicines, sharingAvailable, useCircle, useMedicines } from '../app/state';
import { forSharing } from '../core/history';
import { inviteLink } from '../core/invite';

const INVITE = 'therapeiaShared.invite';

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

/** Moves this device's own medicines into the circle (kept short enough to seal as one item each). */
function moveOwnInto(list: NonNullable<ReturnType<typeof circles.sharedLists>[number]>): number {
  const own = medicines.list();
  const there = new Set(circles.sharedItems(list).map((medicine) => medicine.name.toLowerCase()));
  let moved = 0;
  for (const medicine of own) {
    if (!there.has(medicine.name.toLowerCase())) {
      circles.changeItem(list, medicine.id, forSharing(medicine, new Date()));
      moved += 1;
    }
    medicines.remove(medicine.id);
  }
  return moved;
}

export default function CirclePage({ nav }: { nav: TherapeiaNav }) {
  const sync = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const home = useCircle();
  useMedicines();
  const own = medicines.use();
  const [invite, setInvite] = useState(pendingInvite);
  const [name, setName] = useState('Care');
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
      <div className="page">
        {top}
        <h1 className="title">Share with someone who helps</h1>
        <p className="muted">Sharing needs the server, which isn’t set up for this site.</p>
      </div>
    );
  }

  if (invite && invite.id !== home?.id) {
    return (
      <div className="page">
        {top}
        <section className="card" aria-label="Medicines shared with you">
          <span className="card__eyebrow">Medicines shared with you</span>
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
                    if (home) await circles.leaveList(home);
                    const joined = await circles.joinList(invite);
                    dropInvite();
                    setInvite(undefined);
                    await circles.refreshList(joined);
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
              <AccountCard app="Therapeia" what="Your medicines" waiting="Medicines" />
            </>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>
      </div>
    );
  }

  if (!home) {
    return (
      <div className="page">
        {top}
        <h1 className="title">Share with someone who helps</h1>
        <section className="card">
          <h2 className="card__title card__title--small">A partner, a parent, a carer</h2>
          <p className="muted">Everyone with the link sees the same medicines and doses, and can mark them taken. Encrypted end to end. Readings, visits and the health card stay on this device.</p>
          {signedIn ? (
            <form
              className="field"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  const list = await circles.createList(name);
                  const moved = moveOwnInto(list);
                  if (moved) say(moved === 1 ? 'One medicine shared' : `${moved} medicines shared`);
                });
              }}
            >
              <span className="field__label">Name</span>
              <input className="input" aria-label="Name of the circle" value={name} onChange={(event) => setName(event.target.value)} />
              <button type="submit" className="button-main" disabled={busy || !name.trim()}>Share</button>
            </form>
          ) : (
            <AccountCard app="Therapeia" what="Your medicines" waiting="Medicines" />
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>
      </div>
    );
  }

  const share = async () => {
    const link = inviteLink(location.origin, home);
    try {
      if (navigator.share) await navigator.share({ title: home.name, text: `My medicines in Therapeia: ${link}` });
      else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      }
    } catch {
      // Closed without sharing.
    }
  };

  return (
    <div className="page">
      {top}
      <h1 className="title">{home.name}</h1>
      <section className="card">
        <p className="muted">Anyone with the invite link can join, see the medicines and mark doses. Each medicine is encrypted on the device before it’s sent.</p>
        <button type="button" className="button-main" onClick={() => void share()}><ShareIcon size={18} />Invite</button>
        {copied && <p className="hint" role="status">Link copied.</p>}
      </section>

      {own.length > 0 && (
        <section className="card">
          <p className="muted">{own.length === 1 ? 'One medicine is still only on this device.' : `${own.length} medicines are still only on this device.`}</p>
          <button
            type="button"
            className="button-quiet"
            onClick={() => {
              const before = medicines.list();
              const moved = moveOwnInto(home);
              offerUndo(moved === 1 ? 'One medicine shared' : `${moved} medicines shared`, () => {
                for (const medicine of before) {
                  medicines.put(medicine);
                  circles.changeItem(home, medicine.id, null);
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
          <p>Leave {home.name}? A copy of the medicines stays on this device; the others keep theirs.</p>
          <div className="button-row">
            <button type="button" className="button-quiet" onClick={() => setLeaving(false)}>Cancel</button>
            <button
              type="button"
              className="button-danger"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  // Keep a copy of the medicines on this device.
                  for (const medicine of circles.sharedItems(home)) medicines.put(medicine);
                  await circles.leaveList(home);
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
