import { useEffect, useState, useSyncExternalStore } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { syncStatus } from '../../app/sync/syncController';
import { useAddedApps } from '../../app/family/added';
import { familyApps } from '../../app/family/FamilyApps';
import {
  dropHouseholdInvite,
  joinHousehold,
  leaveHousehold,
  makeHousehold,
  removeHouseholdMember,
  setMemberRole,
  pendingHouseholdInvite,
  restorePart,
  shareApp,
  sharingAvailable,
  stopSharing,
  useHousehold,
} from '../../app/household/household';
import { HOUSEHOLD_APPS, householdLink, type HouseholdApp } from '../../core/household/household';
import { inviteByEmail, refreshInvites, removeInvite, useInvites } from '../../app/household/invites';

const problem = (cause: unknown) => (cause instanceof Error ? cause.message : 'That didn’t go through. Try again.');
const iconOf = (app: HouseholdApp) => (app === 'proairetos' ? '/favicon.svg' : familyApps.find((each) => each.id === app)?.icon);

/**
 * Settings > Household: the people at home, invited once. Each app chosen here shares through its own encrypted list,
 * which everyone in the household joins; the per-app pages (Soma's shared list, Ergon's household, Phyton's home,
 * Therapeia's circle, the shared to-do list) keep working as before.
 */
export default function HouseholdSection({ onOpenAccount }: { onOpenAccount: () => void }) {
  const { offerUndo } = useOverlays();
  const sync = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const added = useAddedApps();
  const { list, parts, members, states, roles, currentUserId, rolesReady, canManageMembers, canManageRoles } = useHousehold();
  const [invite, setInvite] = useState(pendingHouseholdInvite);
  const [name, setName] = useState('Home');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState('');
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const { incoming, outgoing } = useInvites();
  const signedIn = sync.phase !== 'signed-out' && sync.phase !== 'unavailable';

  // Invites waiting for this account, and this account's key (made once its data is open here).
  useEffect(() => {
    if (signedIn && sharingAvailable) void refreshInvites().catch((cause) => setError(problem(cause)));
  }, [signedIn, sync.phase]);

  const run = async (what: string, action: () => Promise<void>) => {
    setBusy(what);
    setError('');
    try {
      await action();
    } catch (cause) {
      setError(problem(cause));
    } finally {
      setBusy(null);
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
        <p className="section-description">Sign in to share with the people at home.</p>
        <button type="button" className="button-accent account-wide" onClick={onOpenAccount}>Account and sync</button>
      </section>
    );
  }

  const fromEmail = incoming.find((each) => each.household.id !== list?.id);
  if (fromEmail) {
    return (
      <section className="settings-card" aria-label="An invite">
        <p className="section-description">
          {fromEmail.from} invited you to {fromEmail.household.name}.{list ? ` Joining leaves ${list.name} on this device.` : ''}
        </p>
        <div className="button-row">
          <button
            type="button"
            className="button-accent"
            disabled={busy !== null}
            onClick={() =>
              void run('join', async () => {
                await joinHousehold(fromEmail.household);
                await removeInvite(fromEmail.id);
              })
            }
          >
            Join
          </button>
          <button type="button" className="button-quiet" disabled={busy !== null} onClick={() => void run('decline', () => removeInvite(fromEmail.id))}>
            Not now
          </button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    );
  }

  if (invite && invite.id !== list?.id) {
    return (
      <section className="settings-card" aria-label="A household shared with you">
        <p className="section-description">
          {invite.name} was shared with you.{list ? ` Joining leaves ${list.name} on this device.` : ''}
        </p>
        <div className="button-row">
          <button
            type="button"
            className="button-accent"
            disabled={busy !== null}
            onClick={() =>
              void run('join', async () => {
                await joinHousehold(invite);
                dropHouseholdInvite();
                setInvite(undefined);
              })
            }
          >
            Join
          </button>
          <button type="button" className="button-quiet" onClick={() => { dropHouseholdInvite(); setInvite(undefined); }}>Not now</button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    );
  }

  if (!list) {
    return (
      <section className="settings-card">
        <form
          className="field household-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            void run('make', () => makeHousehold(name));
          }}
        >
          <span className="field__label">Name</span>
          <input className="input" aria-label="Name of the household" value={name} onChange={(event) => setName(event.target.value)} />
          <button type="submit" className="button-accent account-wide" disabled={busy !== null || !name.trim()}>Make a household</button>
        </form>
        <p className="hint">Encrypted end to end.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    );
  }

  const share = async () => {
    const link = householdLink(location.origin, list);
    try {
      if (navigator.share) await navigator.share({ title: list.name, text: `Our household in Proairetos: ${link}` });
      else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      }
    } catch {
      // Closed without sharing.
    }
  };

  const shown = HOUSEHOLD_APPS.filter(({ app }) => app === 'proairetos' || added.includes(app as never));
  const waiting = outgoing;

  return (
    <div className="settings-sections household">
      <section className="settings-card">
        <h2 className="household__name">{list.name}</h2>
        <section className="household__people" aria-label="Family members">
          <div className="household__people-heading">
            <h3>People</h3>
            <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
          </div>
          {members.length > 0 && (
            <ul className="household__members">
              {members.map((member) => {
                const userId = member.id.slice('member:'.length);
                const role = roles[userId] ?? 'member';
                const isSelf = userId === currentUserId;
                const canRemove = canManageMembers && !isSelf && (role !== 'admin' || canManageRoles);
                return (
                  <li key={member.id} className="household__member">
                    <span className="household__avatar" aria-hidden="true">{member.name.trim().charAt(0).toUpperCase() || '?'}</span>
                    <span className="household__member-info">
                      <span className="household__member-name">{member.name}{isSelf ? ' · You' : ''}</span>
                      {member.email && <span className="household__email">{member.email}</span>}
                    </span>
                    <span className={`household__role household__role--${role}`}>{rolesReady ? role : '…'}</span>
                    {(canManageRoles && !isSelf) || canRemove ? (
                      <div className="household__member-actions">
                        {canManageRoles && !isSelf && (
                          <button
                            type="button"
                            className="text-link"
                            disabled={busy !== null}
                            onClick={() => void run(`role:${userId}`, () => setMemberRole(userId, role === 'admin' ? 'member' : 'admin'))}
                          >
                            {role === 'admin' ? 'Remove admin' : 'Make admin'}
                          </button>
                        )}
                        {canRemove && (
                          <button
                            type="button"
                            className="text-link household__remove-member"
                            disabled={busy !== null}
                            onClick={() => setRemoveConfirm(removeConfirm === userId ? null : userId)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ) : null}
                    {removeConfirm === userId && canRemove && (
                      <div className="household__remove-confirm">
                        <span>Remove {member.name} from this family?</span>
                        <div className="button-row">
                          <button type="button" className="button-quiet" disabled={busy !== null} onClick={() => setRemoveConfirm(null)}>Cancel</button>
                          <button
                            type="button"
                            className="button-danger"
                            disabled={busy !== null}
                            onClick={() => void run(`remove:${userId}`, async () => {
                              await removeHouseholdMember(userId);
                              setRemoveConfirm(null);
                            })}
                          >
                            Remove member
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        {canManageMembers ? (
          <>
            <form
              className="field household__invite"
              onSubmit={(event) => {
                event.preventDefault();
                const to = email.trim();
                void run('invite', async () => {
                  await inviteByEmail(to, list);
                  setEmail('');
                  setSent(to);
                });
              }}
            >
              <span className="field__label">Invite by email</span>
              <input className="input" type="email" autoComplete="email" aria-label="Email" value={email} onChange={(event) => { setEmail(event.target.value); setSent(''); }} />
              <button type="submit" className="button-accent account-wide" disabled={busy !== null || !email.trim()}>Invite</button>
            </form>
            {sent && <p className="hint" role="status">Invite sent to {sent}. It shows when they open any of the apps.</p>}
            <button type="button" className="button-quiet account-wide" onClick={() => void share()}>Send a link instead</button>
            {copied && <p className="hint" role="status">Link copied.</p>}
          </>
        ) : rolesReady ? (
          <p className="hint household__permissions-note">Only the owner and administrators can invite or manage members.</p>
        ) : (
          <p className="hint household__permissions-note">Member management needs the latest Family server update. Apply migration 20261104000000_household_member_roles.sql in Supabase first.</p>
        )}
      </section>

      {waiting.length > 0 && (
        <section className="settings-group" aria-label="Invited">
          <h2 className="settings-group__label">Invited</h2>
          <div className="settings-card settings-card--rows">
            {waiting.map((each) => (
              <div key={each.id} className="household__waiting">
                <span>{each.email}</span>
                <button type="button" className="text-link" disabled={busy !== null} onClick={() => void run('cancel', () => removeInvite(each.id))}>
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="settings-group" aria-label="What your family can see">
        <h2 className="settings-group__label">What you share</h2>
        <p className="section-description">Choose the specific list each app makes available to this household. Nothing else in those apps is included.</p>
        <div className="settings-card settings-card--rows notify-list">
          {shown.map(({ app, name: label, description, sensitive }) => {
            const part = parts.find((each) => each.app === app);
            const state = states[app];
            return (
              <div key={app} className="notify-row household__row">
                <button
                  type="button"
                  className="toggle-row"
                  role="switch"
                  aria-checked={Boolean(part)}
                  aria-pressed={Boolean(part)}
                  disabled={busy !== null || (Boolean(part) && state !== 'shared')}
                  onClick={() => {
                    if (part) {
                      void run(app, async () => {
                        const removed = await stopSharing(app);
                        if (removed) offerUndo(`${label} removed from family sharing`, async () => restorePart(removed));
                      });
                    } else void run(app, () => shareApp(app));
                  }}
                >
                  <span className={`toggle-switch${part ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
                  <span className="toggle-row__text">
                    {iconOf(app) && <img className="household__icon" src={iconOf(app)} alt="" width={20} height={20} />}
                    <span className="household__share-copy">
                      <span className="household__share-name">
                        {label}
                        {sensitive && <span className="household__sensitive">Sensitive</span>}
                      </span>
                      <span className="household__share-description">{description}</span>
                    </span>
                  </span>
                </button>
                {part && state === 'elsewhere' && <p className="hint household__note">Shared through another list on this device; manage that list there.</p>}
                {part && state === 'join' && <p className="hint household__note">Connecting this list to your device…</p>}
              </div>
            );
          })}
        </div>
        <section className="settings-card household__sharing-note">
          <strong>What stays private</strong>
          <p>Personal to-dos, calendar events, reflections, Compass, finances and imported health records are not included in these shares. The Medicines list above is separate and only shared when enabled.</p>
          <p>The person who enables a category manages its switch. Turning it off blocks other household members on their next server sync; copies already downloaded to another device cannot be recalled.</p>
        </section>
      </section>

      {leaving ? (
        <section className="settings-card">
          <p className="section-description">Leave {list.name}? You will stop receiving household updates. Copies already saved on this device remain here.</p>
          <div className="button-row">
            <button type="button" className="button-quiet" onClick={() => setLeaving(false)}>Cancel</button>
            <button
              type="button"
              className="button-danger"
              disabled={busy !== null}
              onClick={() =>
                void run('leave', async () => {
                  await leaveHousehold();
                  setLeaving(false);
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
