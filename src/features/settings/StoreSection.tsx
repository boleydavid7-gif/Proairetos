import { useEffect, useState, type CSSProperties } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { addApp, removeApp, useAddedApps, type AddOn } from '../../app/family/added';
import { familyApps } from '../../app/family/FamilyApps';
import { buy, NeedsSignIn, priceText, refreshOwned, refreshStore, takeBought, usePurchases, waitForPurchase } from '../../app/family/purchases';
import { Waiting } from '../../lamplight/Waiting';

/**
 * The Store: the apps that can be added to Proairetos. Adding one brings it into Proairetos (Today, Days ahead,
 * notifications, search) and the app grid; removing one takes it out again, its records kept. Once the Store takes
 * payments, each app is bought once ($4.99) through Stripe and kept with the account; Proairetos stays free.
 */
export default function StoreSection() {
  const added = useAddedApps();
  const { paid, owned, tester } = usePurchases();
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
    const name = familyApps.find((app) => app.id === bought)?.name ?? 'The app';
    setFinishing(bought);
    void waitForPurchase(bought).then((done) => {
      setFinishing(null);
      if (done) {
        addApp(bought as AddOn);
        setNote({ app: bought, text: `${name} added` });
      } else {
        setNote({ app: bought, text: `Your payment is being confirmed. ${name} shows here as yours in a minute.` });
      }
    });
  }, []);

  const purchase = async (id: AddOn, name: string) => {
    setBusy(id);
    setNote(null);
    try {
      if ((await buy(id)) === 'owned') {
        addApp(id);
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
      <ul className="store__list">
        {apps.map((app) => {
          const id = app.id as AddOn;
          const isAdded = added.includes(id);
          const yours = !paid || tester || owned.includes(id);
          const label = isAdded ? 'Added' : !paid ? 'Free' : tester ? 'Beta' : owned.includes(id) ? 'Purchased' : priceText();
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
                    onClick={() => void purchase(id, app.name)}
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
      </ul>
      {paid && tester ? <p className="store__fine">Beta tester: every app is yours without paying.</p> : null}
      {paid && !tester ? <p className="store__fine">Each app is bought once and stays with your account on every device. Proairetos itself is free.</p> : null}
      <a className="text-link" href="/welcome/">
        Adding an app to your Home Screen
      </a>
    </section>
  );
}
