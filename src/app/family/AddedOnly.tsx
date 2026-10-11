import type { CSSProperties, ReactNode } from 'react';
import { addApp, useAddedApps, type AddOn } from './added';
import { familyApps } from './FamilyApps';
import './addedOnly.css';

/** An app that is not added to Proairetos shows its logo and name with Add, in place of the app. */
export default function AddedOnly({ app, children }: { app: AddOn; children: ReactNode }) {
  const added = useAddedApps();
  if (added.includes(app)) return <>{children}</>;
  const about = familyApps.find((each) => each.id === app);
  if (!about) return <>{children}</>;
  const tint = about.tint ?? { ground: '#0e1112', accent: '#c9a274', ink: '#ece8e1' };
  return (
    <main className="added-only" style={{ '--ground': tint.ground, '--accent-app': tint.accent, '--ink': tint.ink } as CSSProperties}>
      <div className="added-only__card">
        <img className="added-only__logo" src={about.icon} alt="" width={88} height={88} />
        <h1 className="added-only__name">{about.name}</h1>
        <p className="added-only__by">by Proairetos</p>
        <p className="added-only__line">{about.line}</p>
        {about.about && <p className="added-only__about">{about.about}</p>}
        <button type="button" className="added-only__add" onClick={() => addApp(app)}>
          Add
        </button>
        <a className="added-only__store" href="/?open=settings:store">
          Open the Store in Proairetos
        </a>
      </div>
    </main>
  );
}
