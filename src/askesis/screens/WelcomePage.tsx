import type { Nav } from '../app/App';
import { Mark } from '../app/icons';
import { scene } from '../app/scenes';

/** The first screen: what this is, and one way in. */
export default function WelcomePage({ nav }: { nav: Nav }) {
  return (
    <div className="welcome">
      <img className="welcome__image" src={scene('sunset-lake')} alt="" />
      <div className="welcome__shade" />
      <div className="welcome__content">
        <Mark size={48} />
        <h1 className="welcome__name">Askesis</h1>
        <p className="welcome__about">
          A running plan from your first walk-run to a marathon, built on endurance research.
        </p>
        <div className="welcome__actions">
          <button type="button" className="button-main" onClick={() => nav.go({ name: 'safety', first: true })}>
            Begin
          </button>
        </div>
      </div>
    </div>
  );
}
