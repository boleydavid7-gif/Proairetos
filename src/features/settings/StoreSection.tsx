import { useOverlays } from '../../app/overlays/OverlayContext';
import { addApp, removeApp, useAddedApps, type AddOn } from '../../app/family/added';
import { familyApps } from '../../app/family/FamilyApps';

/**
 * The Store: the apps that can be added to Proairetos. Adding one brings it into Proairetos (Today, Days ahead,
 * notifications, search) and the app grid; removing one takes it out again, its records kept.
 */
export default function StoreSection() {
  const added = useAddedApps();
  const { offerUndo } = useOverlays();
  const apps = familyApps.filter((app) => app.id !== 'proairetos');

  return (
    <section className="store" aria-label="Store">
      <ul className="store__list">
        {apps.map((app) => {
          const id = app.id as AddOn;
          const isAdded = added.includes(id);
          return (
            <li key={app.id} className="store__app">
              <div className="store__head">
                <img className="store__icon" src={app.icon} alt="" width={48} height={48} />
                <div className="store__words">
                  <h2 className="store__name">{app.name}</h2>
                  <p className="store__line">{app.line}</p>
                </div>
                <span className="store__price">{isAdded ? 'Added' : 'Free'}</span>
              </div>
              {app.about && <p className="store__about">{app.about}</p>}
              {app.shot && <img className="store__shot" src={app.shot} alt={`${app.name} on a phone`} />}
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
                ) : (
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
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <a className="text-link" href="/welcome/">
        Adding an app to your Home Screen
      </a>
    </section>
  );
}
