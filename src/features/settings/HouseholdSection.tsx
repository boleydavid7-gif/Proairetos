import { useState, useSyncExternalStore } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { syncStatus } from '../../app/sync/syncController';
import { useAddedApps } from '../../app/family/added';
import { familyApps } from '../../app/family/FamilyApps';
import {
  dropHouseholdInvite,
  joinHousehold,
  leaveHousehold,
  makeHousehold,
  pendingHouseholdInvite,
  restorePart,
  shareApp,
  sharingAvailable,
  stopSharing,
  useHousehold,
} from '../../app/household/household';
import { HOUSEHOLD_APPS, householdLink, namesText, type HouseholdApp } from '../../core/household/household';

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
  const { list, parts, members, states } = useHousehold();
  const [invite, setInvite] = useState(pendingHouseholdInvite);
  const [name, setName] = useState('Home');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const signedIn = sync.phase !== 'signed-out' && sync.phase !== 'unavailable';

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
          className="field"
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
  const names = members.map((member) => member.name);

  return (
    <div className="settings-sections household">
      <section className="settings-card">
        <h2 className="household__name">{list.name}</h2>
        {names.length > 0 && <p className="section-description">{namesText(names)}</p>}
        <button type="button" className="button-accent account-wide" onClick={() => void share()}>Invite</button>
        {copied && <p className="hint" role="status">Link copied.</p>}
      </section>

      <section className="settings-group" aria-label="Shared">
        <h2 className="settings-group__label">Shared</h2>
        <div className="settings-card settings-card--rows notify-list">
          {shown.map(({ app, name: label }) => {
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
                  disabled={busy !== null}
                  onClick={() => {
                    if (part) {
                      const removed = stopSharing(app);
                      if (removed) offerUndo(`${label} no longer shared`, async () => restorePart(removed));
                    } else void run(app, () => shareApp(app));
                  }}
                >
                  <span className={`toggle-switch${part ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
                  <span className="toggle-row__text">
                    {iconOf(app) && <img className="household__icon" src={iconOf(app)} alt="" width={20} height={20} />}
                    {label}
                  </span>
                </button>
                {part && state === 'elsewhere' && <p className="hint household__note">Shared through another list on this device.</p>}
              </div>
            );
          })}
        </div>
      </section>

      {leaving ? (
        <section className="settings-card">
          <p className="section-description">Leave {list.name}? What each app shares stays until you leave it in that app.</p>
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
