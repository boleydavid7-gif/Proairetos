import { useEffect, useState, type CSSProperties } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { addApp, removeApp, useAddedApps, type AddOn } from '../../app/family/added';
import { familyApps } from '../../app/family/FamilyApps';
import { buy, CORE_APPS, NeedsSignIn, priceText, refreshOwned, refreshStore, takeBought, usePurchases, waitForPurchase, type PurchaseItem } from '../../app/family/purchases';
import { Waiting } from '../../lamplight/Waiting';
import { apiUrl } from '../../app/apiBase';
import { supabase } from '../../data/sync/supabase';

/**
 * The Store: the apps that can be added to Proairetos. Adding one brings it into Proairetos (Today, Days ahead,
 * notifications, search) and the app grid; removing one takes it out again, its records kept. Proairetos stays free;
 * access to the family is granted by monthly plans kept with the signed-in account.
 */
export default function StoreSection() {
  const added = useAddedApps();
  const { paid, owned, tester, owner, trialUntil } = usePurchases();
  const { offerUndo } = useOverlays();
  const apps = familyApps.filter((app) => app.id !== 'proairetos');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ app: string; text: string; signIn?: boolean } | null>(null);
  const [finishing, setFinishing] = useState<string | null>(null);

  useEffect(() => {
    void refreshStore();
    void refreshOwned();
    // Back from Stripe: wait for the purchase to be recorded, then add the app.
    const bought = takeBought();
    if (!bought) return;
    const name = bought === 'core' ? 'Core apps' : bought === 'bundle' ? 'Soma + Phyton' : bought === 'cloud' ? 'Proairetos cloud' : familyApps.find((app) => app.id === bought)?.name ?? 'The app';
    setFinishing(bought);
    void waitForPurchase(bought).then((done) => {
      setFinishing(null);
      if (done) {
        addPlan(bought);
        setNote({ app: bought, text: `${name} added` });
      } else {
        setNote({ app: bought, text: `Your payment is being confirmed. ${name} shows here as yours in a minute.` });
      }
    });
  }, []);

  const purchase = async (id: PurchaseItem, name: string) => {
    setBusy(id);
    setNote(null);
    try {
      if ((await buy(id)) === 'owned') {
        addPlan(id);
        setNote({ app: id, text: `${name} added` });
      }
    } catch (error) {
      if (error instanceof NeedsSignIn) setNote({ app: id, text: 'Buying keeps the app with your account, so sign in first.', signIn: true });
      else setNote({ app: id, text: error instanceof Error ? error.message : 'The payment page did not open.' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="store" aria-label="Store">
      <div className="store__paywall">
        <p className="eyebrow">Proairetos Store</p>
        <h2>Choose what belongs in your family</h2>
        <p>Proairetos stays free. Subscriptions unlock the companion apps and optional services, and follow your account on every device.</p>
        <div className="store__plans">
          <PlanCard plan="core" title="Core apps" detail="All service-free family apps" price={priceText('core')} owned={owner || tester || owned.includes('core')} busy={busy} finishing={finishing} onBuy={purchase} />
          <PlanCard plan="soma" title="Soma" detail="Recipes and groceries" price={priceText('soma')} owned={owner || tester || owned.includes('soma')} busy={busy} finishing={finishing} onBuy={purchase} />
          <PlanCard plan="phyton" title="Phyton" detail="Plant identification" price={priceText('phyton')} owned={owner || tester || owned.includes('phyton')} busy={busy} finishing={finishing} onBuy={purchase} />
          <PlanCard plan="bundle" title="Soma + Phyton" detail={owned.includes('soma') && !owned.includes('phyton') ? 'Add Phyton' : owned.includes('phyton') && !owned.includes('soma') ? 'Add Soma' : 'Both apps together'} price={owned.includes('soma') !== owned.includes('phyton') ? '$3.00' : priceText('bundle')} owned={owner || tester || (owned.includes('soma') && owned.includes('phyton'))} busy={busy} finishing={finishing} onBuy={purchase} />
          {(!tester || owner) && <PlanCard plan="cloud" title="Proairetos cloud" detail="Encrypted backup and sync" price={priceText('cloud')} owned={owner || owned.includes('cloud')} busy={busy} finishing={finishing} onBuy={purchase} />}
        </div>
        {note ? <p className="store__note" role="status">{note.text}{note.signIn ? <>{' '}<a className="text-link" href="/?open=account">Sign in</a></> : null}</p> : null}
        {!paid && !owner && !tester ? <p className="store__fine">Checkout isn’t open yet.</p> : null}
        {tester && !owner ? <p className="store__fine">Seven-day beta access includes the apps. Proairetos cloud is not included; use local storage or your own cloud.</p> : null}
        {trialUntil && !tester && !owner ? <p className="store__fine">Free trial of every app until {new Date(trialUntil).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}. Proairetos cloud is not included.</p> : null}
        {owner ? <p className="store__fine">Owner access is enabled for this account.</p> : null}
      </div>
      {(owner || tester || trialUntil || owned.length > 0) && <ul className="store__list">
        {apps.map((app) => {
          const id = app.id as AddOn;
          const isAdded = added.includes(id);
          const coreAccess = owner || tester || Boolean(trialUntil) || owned.includes('core');
          const yours = owner || tester || Boolean(trialUntil) || (id === 'soma' ? owned.includes('soma') : id === 'phyton' ? owned.includes('phyton') : coreAccess);
          const label = isAdded ? 'Added' : yours ? tester ? 'Beta' : trialUntil && !owned.includes(id === 'soma' || id === 'phyton' ? id : 'core') ? 'Trial' : 'Available' : 'Locked';
          return (
            <li key={app.id} className="store__app">
              <div
                className="store__banner"
                style={app.tint ? ({ '--ground': app.tint.ground, '--accent-app': app.tint.accent, '--ink': app.tint.ink } as CSSProperties) : undefined}
              >
                <img className="store__logo" src={app.icon} alt="" width={64} height={64} />
                <h2 className="store__name">{app.name}</h2>
                <p className="store__by">by Proairetos</p>
              </div>
              <div className="store__head">
                <p className="store__line">{app.line}</p>
                <span className="store__price">{label}</span>
              </div>
              {app.about && <p className="store__about">{app.about}</p>}
              <div className="store__actions">
                {isAdded ? (
                  <>
                    <a className="button-accent store__button" href={app.href}>
                      Open
                    </a>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => {
                        removeApp(id);
                        offerUndo(`${app.name} removed from Proairetos`, async () => addApp(id));
                      }}
                    >
                      Remove
                    </button>
                  </>
                ) : yours ? (
                  <button
                    type="button"
                    className="button-accent store__button"
                    onClick={() => {
                      addApp(id);
                      offerUndo(`${app.name} added`, async () => removeApp(id));
                    }}
                  >
                    Add
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button-accent store__button"
                    disabled={busy !== null || finishing === id}
                    onClick={() => void purchase(id === 'soma' ? 'soma' : id === 'phyton' ? 'phyton' : 'core', app.name)}
                  >
                    {finishing === id ? <Waiting>Finishing…</Waiting> : busy === id ? <Waiting>Opening…</Waiting> : `Buy · ${priceText()}`}
                  </button>
                )}
              </div>
              {note?.app === app.id ? (
                <p className="store__note" role="status">
                  {note.text}
                  {note.signIn ? (
                    <>
                      {' '}
                      <a className="text-link" href="/?open=account">
                        Sign in
                      </a>
                    </>
                  ) : null}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>}
      {!tester && !owner ? <p className="store__fine">Plans renew monthly and stay with your account on every device. Proairetos itself is free.</p> : null}
      {owner && <><BetaAccessPanel /><SignedInUsersPanel /></>}
      <a className="text-link" href="/welcome/">
        Adding an app to your Home Screen
      </a>
    </section>
  );
}

function addPlan(plan: string): void {
  if (plan === 'core') CORE_APPS.forEach((app) => addApp(app));
  else if (plan === 'bundle') { addApp('soma'); addApp('phyton'); }
  else if (plan !== 'cloud') addApp(plan as AddOn);
}

function PlanCard({ plan, title, detail, price, owned, busy, finishing, onBuy }: { plan: PurchaseItem; title: string; detail: string; price: string; owned: boolean; busy: string | null; finishing: string | null; onBuy: (plan: PurchaseItem, name: string) => Promise<void> }) {
  return <article className="store__plan"><div><h3>{title}</h3><p>{detail}</p></div><strong>{owned ? 'Included' : `${price}/mo`}</strong>{owned ? <span className="store__plan-state">Available</span> : <button type="button" className="button-accent" disabled={busy !== null || finishing === plan} onClick={() => void onBuy(plan, title)}>{finishing === plan ? <Waiting>Finishing…</Waiting> : busy === plan ? <Waiting>Opening…</Waiting> : 'Subscribe'}</button>}</article>;
}

type BetaEntry = { email: string; expires_at: string };

function BetaAccessPanel() {
  const [entries, setEntries] = useState<BetaEntry[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [, tick] = useState(0);

  const request = async (path = '/api/store/beta', init: RequestInit = {}) => {
    const client = await supabase();
    const token = (await client.auth.getSession()).data.session?.access_token;
    if (!token) throw new Error('Sign in again to manage beta access.');
    const response = await fetch(apiUrl(path), { ...init, headers: { ...(init.headers ?? {}), authorization: `Bearer ${token}`, 'content-type': 'application/json' } });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(body.error ?? 'Beta access could not be updated.');
    return body;
  };

  const load = async () => {
    try {
      const body = await request();
      setEntries(body as unknown as BetaEntry[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Beta access could not be loaded.');
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => { const timer = window.setInterval(() => tick((value) => value + 1), 60_000); return () => window.clearInterval(timer); }, []);

  const add = async () => {
    setBusy(true);
    setMessage('');
    try {
      await request('/api/store/beta', { method: 'POST', body: JSON.stringify({ email, days: 7 }) });
      setEmail('');
      setMessage('Seven-day beta access granted.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Beta access could not be granted.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (entry: BetaEntry) => {
    setBusy(true);
    setMessage('');
    try {
      await request('/api/store/beta', { method: 'DELETE', body: JSON.stringify({ email: entry.email }) });
      setEntries((current) => current.filter((item) => item.email !== entry.email));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Beta access could not be removed.');
    } finally {
      setBusy(false);
    }
  };

  return <section className="store__beta" aria-label="Beta access"><h2>Beta access</h2><p>Give someone full access to the apps for seven days while they try the family. Cloud sync is excluded.</p><div className="store__beta-form"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Beta tester email" /><button type="button" className="button-accent" onClick={() => void add()} disabled={busy || !email.trim()}>Grant 7 days</button></div>{entries.length > 0 && <ul className="store__beta-list">{entries.map((entry) => <li key={entry.email}><span><strong>{entry.email}</strong><small>{remainingBeta(entry.expires_at)} · Until {new Date(entry.expires_at).toLocaleString()}</small></span><button type="button" className="text-link" onClick={() => void remove(entry)} disabled={busy}>Remove</button></li>)}</ul>}{message && <p className="store__note" role="status">{message}</p>}</section>;
}

function remainingBeta(expiresAt: string): string {
  const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  if (!remaining) return 'Expired';
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
  return `${hours}h ${minutes}m left`;
}

type SignedInUser = { email: string; created_at: string; last_sign_in_at: string };

function SignedInUsersPanel() {
  const [users, setUsers] = useState<SignedInUser[]>([]);
  const [message, setMessage] = useState('');
  const load = async () => {
    try {
      const client = await supabase();
      const token = (await client.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error('Sign in again to view users.');
      const response = await fetch(apiUrl('/api/store/users'), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
      const body = (await response.json().catch(() => ({}))) as { users?: SignedInUser[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'The signed-in user list could not be loaded.');
      setUsers(body.users ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The signed-in user list could not be loaded.');
    }
  };
  useEffect(() => { void load(); }, []);
  return <section className="store__beta store__users" aria-label="Signed-in users"><h2>Signed-in users</h2><p>Only you can see this list. It shows the first 100 accounts from Supabase Auth.</p><button type="button" className="button-quiet" onClick={() => void load()}>Refresh list</button>{users.length > 0 && <ul className="store__beta-list">{users.map((user) => <li key={`${user.email}-${user.created_at}`}><span><strong>{user.email || 'No email'}</strong><small>Joined {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'unknown'} · Last sign-in {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'never'}</small></span></li>)}</ul>}{message && <p className="store__note" role="status">{message}</p>}</section>;
}
