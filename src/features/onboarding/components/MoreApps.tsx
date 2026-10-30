import { useEffect, useState, type CSSProperties } from 'react';
import CompassRose from '../../../components/brand/CompassRose';
import { FamilyMark } from '../../../app/family/marks';
import { familyApps } from '../../../app/family/FamilyApps';
import { tap } from '../../../app/feel';
import { priceText } from '../../../app/family/purchases';

/** The prices, from the Store's own figures (the server's when known). */
const PLANS: { name: string; price: () => string; detail?: string }[] = [
  { name: 'Proairetos', price: () => 'Free' },
  { name: 'Core apps', price: () => `${priceText('core')}/mo`, detail: 'Every app here but Soma and Phyton' },
  { name: 'Soma', price: () => `${priceText('soma')}/mo` },
  { name: 'Phyton', price: () => `${priceText('phyton')}/mo` },
  { name: 'Soma + Phyton', price: () => `${priceText('bundle')}/mo` },
];

/** What can pull at a person's attention, and the apps for each. Choosing only brings those apps forward; nothing is added. */
const INTERESTS: { label: string; apps: string[] }[] = [
  { label: 'Health and fitness', apps: ['askesis', 'dynamis', 'diaita', 'therapeia'] },
  { label: 'Food', apps: ['soma'] },
  { label: 'Home', apps: ['ergon', 'ktema', 'phyton'] },
  { label: 'Money', apps: ['oikonomia'] },
  { label: 'People', apps: ['philia'] },
  { label: 'Travel', apps: ['poreia'] },
  { label: 'Reading and notes', apps: ['theoria', 'mneme'] },
];

/** The apps the Store offers (not Proairetos itself). */
const ADD_ONS = familyApps.filter((app) => app.id !== 'proairetos');

/** The moving parts come together: the apps drift in from all sides and settle in a ring around the compass. */
function Gathering({ wanted }: { wanted: Set<string> }) {
  const [gathered, setGathered] = useState(false);
  useEffect(() => {
    // Two frames, so the scattered places are painted before the ring is set.
    let second = 0;
    const first = requestAnimationFrame(() => (second = requestAnimationFrame(() => setGathered(true))));
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);
  return (
    <div className="gathering" data-gathered={gathered || undefined} data-choosing={wanted.size > 0 || undefined} aria-hidden="true">
      <span className="gathering__center">
        <CompassRose size={44} tone="light" />
      </span>
      {ADD_ONS.map((app, index) => {
        const turn = (index / ADD_ONS.length) * Math.PI * 2 - Math.PI / 2;
        // Each comes from well outside the ring, along its own line, a little turned.
        const from = 1.7 + (index % 3) * 0.25;
        return (
          <span
            key={app.id}
            className="gathering__app"
            data-lit={wanted.has(app.id) || undefined}
            style={
              {
                '--x': Math.cos(turn).toFixed(4),
                '--y': Math.sin(turn).toFixed(4),
                '--from': from,
                '--i': index,
              } as CSSProperties
            }
          >
            <FamilyMark app={app.id} size={24} />
          </span>
        );
      })}
    </div>
  );
}

/** The other apps in the family: they gather, the person says what pulls at them, and the matching ones come forward. */
export default function MoreApps({ onStore }: { onStore: () => void }) {
  const [chosen, setChosen] = useState<string[]>([]);
  const wanted = new Set(INTERESTS.filter((each) => chosen.includes(each.label)).flatMap((each) => each.apps));
  const apps = ADD_ONS.map((app, order) => ({ app, order, match: wanted.has(app.id) })).sort(
    (a, b) => Number(b.match) - Number(a.match) || a.order - b.order,
  );
  return (
    <div className="ob-panel more-apps">
      <Gathering wanted={wanted} />
      <h3 className="ob-panel__ask">What pulls at your attention?</h3>
      <div className="ob-chips" role="group" aria-label="What pulls at your attention?">
        {INTERESTS.map((each) => (
          <button
            key={each.label}
            type="button"
            className="ob-chip"
            aria-pressed={chosen.includes(each.label)}
            onClick={() => {
              tap();
              setChosen((now) => (now.includes(each.label) ? now.filter((label) => label !== each.label) : [...now, each.label]));
            }}
          >
            {each.label}
          </button>
        ))}
      </div>
      <ul className="ob-card more-apps__list" data-choosing={chosen.length > 0 || undefined}>
        {apps.map(({ app, match }) => (
          <li key={app.id} className="more-apps__app" data-match={match || undefined}>
            <img src={app.icon} alt="" width={40} height={40} />
            <span>
              <strong>{app.name}</strong>
              <small>{app.line}</small>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="ob-quiet" onClick={onStore}>Open the Store</button>
      <Sibling />
    </div>
  );
}

/** Noesis, made by the same people and kept apart from the Store: one small card with a link. */
export function Sibling() {
  return (
    <a className="more-apps__sibling" href="https://noesis.proairetos.com/" target="_blank" rel="noopener">
      <img src="/partners/noesis.png" alt="" width={40} height={40} />
      <span>
        <small>From Proairetos</small>
        <strong>Noesis</strong>
        <span className="more-apps__sibling-about">
          <b>Follow the rabbit</b>
          You never know where an idea might lead. Discover connected ideas, and explore your world and others through
          reading.
        </span>
      </span>
      <span className="more-apps__sibling-open">Open</span>
    </a>
  );
}

/** What things cost and how sync works: its own step, passed over with Continue or Skip this. The light walks the
 *  trial once, from today to its end. */
export function PlansAndSync() {
  return (
    <div className="ob-panel more-apps">
      <section className="ob-card trial" aria-label="Your free trial">
        <h3>Your free trial</h3>
        <ol className="trial-line">
          <li><b>Today</b><span>Make an account and every app is yours. No card needed.</span></li>
          <li><b>Day 6</b><span>An email reminder before your trial ends.</span></li>
          <li><b>Day 7</b><span>The trial ends. Nothing is charged; Proairetos stays free.</span></li>
        </ol>
      </section>
      <section className="ob-card more-apps__plans" aria-label="Prices">
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
      <section className="ob-card more-apps__sync" aria-label="Sync">
        <h3>Sync</h3>
        <p>Everything is kept on this device. To use it on more than one, sync through your own Google Drive, Dropbox or OneDrive, or through Proairetos cloud: 1 GB for {priceText('cloud')}/mo.</p>
        <p className="ob-fine">Either way, your records are encrypted on your device before they leave it.</p>
      </section>
    </div>
  );
}
