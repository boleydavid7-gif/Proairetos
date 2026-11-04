import { useState, useSyncExternalStore } from 'react';
import AccountCard from '../../app/family/AccountCard';
import { offerUndo } from '../../app/family/shell';
import { BackIcon } from '../../app/family/icons';
import { syncStatus } from '../../app/sync/syncController';
import { useHousehold } from '../../app/household/household';
import type { ErgonNav } from '../app/App';
import { homes, ownChores, sharingAvailable, useChores, useHome } from '../app/state';
import { nextDay } from '../core/chores';
import { addDays, toLocalDate } from '../../core/scheduling/dates';

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
  const chores = useChores();
  const family = useHousehold();
  const own = ownChores.use();
  const today = toLocalDate(new Date());
  const familyConnected = family.parts.some((part) => part.app === 'ergon');
  const from = addDays(today, -30);
  const recentActivity = chores
    .flatMap((chore) => (chore.activity ?? []).map((event) => ({ ...event, choreId: chore.id, choreName: chore.name })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 20);
  const unassigned = chores.filter((chore) => nextDay(chore) && !chore.whoId && !chore.who).length;
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
          <h2 className="card__title card__title--small">Not connected</h2>
          <a className="button-main" href="/?open=settings:household">Open Family settings</a>
          {!signedIn && <AccountCard app="Ergon" what="Your chores" waiting="Chores" />}
        </section>
      </div>
    );
  }

  const familyName = familyConnected ? family.list?.name ?? home.name : home.name;
  const members = family.members.map((member) => {
    const userId = member.id.slice('member:'.length);
    const assignedChores = chores.filter((chore) => nextDay(chore) && (chore.whoId === userId || (!chore.whoId && chore.who === member.name)));
    const assigned = assignedChores.length;
    const estimatedMinutes = assignedChores.reduce((total, chore) => total + (chore.minutes ?? 0), 0);
    const completed = chores.reduce((total, chore) => total + chore.history.filter((done) => done.date > from && (done.byId === userId || (!done.byId && done.by === member.name))).length, 0);
    return { ...member, userId, assigned, estimatedMinutes, completed, role: family.rolesReady ? family.roles[userId] ?? 'member' : 'member' };
  });

  return (
    <div className="page ergon-page">
      {top}
      <h1 className="title">{familyName}</h1>

      <div className="section-head">
        <h2>People</h2>
        <span className="muted">{familyConnected ? members.length : 'Not connected'}</span>
      </div>
      {familyConnected && (
        members.length > 0 ? (
          <ul className="rows">
            {members.map((member) => (
              <li key={member.id} className="row row--aside">
                <span className="row__text">
                  <span>{member.name}{member.userId === family.currentUserId ? ' (you)' : ''}</span>
                  <span className="row__detail">{member.role === 'owner' ? 'Owner' : member.role === 'admin' ? 'Administrator' : 'Member'}</span>
                </span>
                <span className="muted">{member.assigned} open{member.estimatedMinutes > 0 ? ` · ${member.estimatedMinutes} min` : ''} · {member.completed} done</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Members are syncing.</p>
        )
      )}
      {familyConnected && unassigned > 0 && <p className="muted">{unassigned} {unassigned === 1 ? 'chore is' : 'chores are'} open to everyone.</p>}
      <a className="button-quiet" href="/?open=settings:household">Family settings</a>

      {familyConnected && (
        <section className="card">
          <div className="section-head">
            <h2>Recent activity</h2>
          <span className="muted">{recentActivity.length ? `Latest ${recentActivity.length}` : 'No activity yet'}</span>
        </div>
        {recentActivity.length > 0 ? (
          <ul className="notes-list">
            {recentActivity.map((event) => {
              const actor = family.members.find((member) => member.id === `member:${event.byId}`)?.name ?? event.by;
              const target = event.assignedToId
                ? family.members.find((member) => member.id === `member:${event.assignedToId}`)?.name ?? event.assignedTo ?? 'a former member'
                : event.assignedTo;
              const next = event.nextAssigneeId
                ? family.members.find((member) => member.id === `member:${event.nextAssigneeId}`)?.name ?? event.nextAssignee ?? 'a former member'
                : event.nextAssignee;
              const verb = event.action === 'added' ? 'added' : event.action === 'completed' ? 'completed' : event.action === 'assigned' ? 'assigned' : 'updated';
              const detail = event.action === 'assigned' ? ` to ${target ?? 'anyone'}` : event.action === 'completed' && next ? ` · Next: ${next}` : '';
              const when = new Date(event.at);
              return (
                <li key={event.id} className="note-line">
                  <span><strong>{actor}</strong> {verb} <strong>{event.choreName}</strong>{detail}</span>
                  <span className="muted">{when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
        </section>
      )}

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
