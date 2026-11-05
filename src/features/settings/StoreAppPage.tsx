import type { CSSProperties, ReactNode } from 'react';
import { appDetails } from '../../app/family/appDetails';
import { familyApps, type FamilyApp } from '../../app/family/FamilyApps';
import type { AddOn } from '../../app/family/added';
import { Sym } from '../../lamplight/icons';

/**
 * One app in the Store, as the App Store shows one: its banner, the way to add it, its own screenshots, what it
 * does and how it connects. `actions` is the same add, open or buy control the list uses.
 */
export default function StoreAppPage({ id, label, added, actions, onBack }: { id: AddOn; label: string; added: readonly AddOn[]; actions: ReactNode; onBack: () => void }) {
  const app = familyApps.find((each) => each.id === id);
  const detail = appDetails[id];
  if (!app) return null;
  const nameOf = (other: FamilyApp) => familyApps.find((each) => each.id === other);
  return (
    <article className="store-app" aria-label={app.name}>
      <button type="button" className="back-link" onClick={onBack}><Sym name="back" size={18} />App Store</button>
      <div
        className="store__banner store-app__banner"
        style={app.tint ? ({ '--ground': app.tint.ground, '--accent-app': app.tint.accent, '--ink': app.tint.ink } as CSSProperties) : undefined}
      >
        <img className="store__logo" src={app.icon} alt="" width={72} height={72} />
        <h2 className="store__name">{app.name}</h2>
        <p className="store__by">{app.line}</p>
      </div>
      <div className="store-app__buy">
        <span className="store__price">{label}</span>
        {actions}
      </div>
      {detail && detail.shots > 0 && (
        <div className="store-app__shots" role="group" aria-label={`${app.name} screenshots`}>
          {Array.from({ length: detail.shots }, (_, at) => (
            <img key={at} src={`/${id}/screenshots/narrow-${at + 1}.webp`} alt="" width={195} height={422} decoding="async" />
          ))}
        </div>
      )}
      {app.about && (
        <section className="store-app__section">
          <h3>What it is</h3>
          <p>{app.about}</p>
        </section>
      )}
      {detail && (
        <>
          <section className="store-app__section">
            <h3>What it does</h3>
            <ul className="store-app__does">
              {detail.does.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </section>
          <section className="store-app__section">
            <h3>How it connects</h3>
            <ul className="store-app__connects">
              {detail.connects.map((link) => {
                const other = nameOf(link.app);
                const here = link.app === 'proairetos' || added.includes(link.app as AddOn);
                return (
                  <li key={link.app}>
                    <div className="store-app__link">
                      {other && <img className="store-app__mini" src={other.icon} alt="" width={36} height={36} />}
                      <span className="store-app__link-text">
                        <span>{other?.name}{link.app !== 'proairetos' && <small className="store-app__state">{here ? 'Added' : 'Not added'}</small>}</span>
                        <span className="store-app__link-detail">{link.text}</span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </article>
  );
}
