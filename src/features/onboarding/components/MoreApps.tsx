import { familyApps } from '../../../app/family/FamilyApps';

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
