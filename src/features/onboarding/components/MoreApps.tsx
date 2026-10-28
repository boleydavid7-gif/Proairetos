import { familyApps } from '../../../app/family/FamilyApps';
import { priceText } from '../../../app/family/purchases';

/** The prices, from the Store's own figures (the server's when known). */
const PLANS: { name: string; price: () => string; detail?: string }[] = [
  { name: 'Proairetos', price: () => 'Free' },
  { name: 'Core apps', price: () => `${priceText('core')}/mo`, detail: 'Every app here but Soma and Phyton' },
  { name: 'Soma', price: () => `${priceText('soma')}/mo` },
  { name: 'Phyton', price: () => `${priceText('phyton')}/mo` },
  { name: 'Soma + Phyton', price: () => `${priceText('bundle')}/mo` },
];

/** The other apps in the family, briefly, and how to add them. */
export default function MoreApps({ onStore }: { onStore: () => void }) {
  return (
    <div className="make-yours more-apps">
      <ul className="more-apps__list">
        {familyApps
          .filter((app) => app.id !== 'proairetos')
          .map((app) => (
            <li key={app.id} className="more-apps__app">
              <img src={app.icon} alt="" width={36} height={36} />
              <span>
                <strong>{app.name}</strong>
                <small>{app.line}</small>
              </span>
            </li>
          ))}
      </ul>
      <ol className="home-screen__steps">
        <li>Add one from the Store: Settings, Apps, Store, or the grid beside the gear.</li>
        <li>Open it, then add it to the Home Screen the same way as Proairetos.</li>
        <li>Sign in once in each: Proairetos can copy a sign-in pass for them.</li>
      </ol>
      <button type="button" className="more-apps__store" onClick={onStore}>Open the Store</button>
    </div>
  );
}

/** What things cost and how sync works: its own step, passed over with Continue or Skip this. */
export function PlansAndSync() {
  return (
    <div className="make-yours more-apps">
      <section className="more-apps__plans" aria-label="Prices">
        <h3>Prices</h3>
        <ul>
          {PLANS.map((plan) => (
            <li key={plan.name}>
              <span>
                <strong>{plan.name}</strong>
                {plan.detail && <small>{plan.detail}</small>}
              </span>
              <span className="more-apps__price">{plan.price()}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="more-apps__sync" aria-label="Sync">
        <h3>Sync</h3>
        <p>Everything is kept on this device. To use it on more than one device, sync through your own Google Drive, Dropbox or OneDrive, or through Proairetos cloud: 1 GB for {priceText('cloud')}/mo.</p>
        <p className="home-screen__fine">Either way, your records are encrypted on your device before they leave it.</p>
      </section>
    </div>
  );
}
