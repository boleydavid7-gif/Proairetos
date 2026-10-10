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
        <Mark size={64} />
        <h1 className="welcome__name">ASKESIS</h1>
        <p className="welcome__by">by Proairetos</p>
        <p className="welcome__line">Learn. Train. Endure.</p>
        <span className="welcome__rule" aria-hidden="true" />
        <p className="welcome__about">
          A gradual path from your first walk-run to a marathon, built on the science of endurance training. Askesis is
          the Stoics’ word for training: practice, repeated.
        </p>
        <div className="welcome__actions">
          <button type="button" className="button-main" onClick={() => nav.go({ name: 'safety', first: true })}>
            Get started
          </button>
          <p className="fine">Everything stays on this phone.</p>
        </div>
      </div>
    </div>
  );
}
