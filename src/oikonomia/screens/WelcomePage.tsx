import type { Nav } from '../app/App';
import heroImage from '../../assets/images/scenes/valley.webp';
import heroWide from '../../assets/images/scenes/valley-wide.webp';
import { ArchMark } from '../app/icons';
import { saveSettings, loadSettings } from '../data/store';

export default function WelcomePage({ nav }: { nav: Nav }) {
  return (
    <div className="welcome">
      <picture>
        <source media="(min-width: 62rem)" srcSet={heroWide} />
        <img className="welcome__image" src={heroImage} alt="" />
      </picture>
      <div className="welcome__shade" />
      <div className="welcome__content">
        <ArchMark size={64} light />
        <h1 className="welcome__name">OIKONOMIA</h1>
        <p className="welcome__by">by Proairetos</p>
        <p className="welcome__line">Keep the essentials in view.</p>
        <span className="welcome__rule" aria-hidden="true" />
        <p className="welcome__about">
          A quiet place for the bills and subscriptions that sustain your life. Add them once, keep their dates in view, and let
          your calendar carry the remembering.
        </p>
        <div className="welcome__actions">
          <button
            type="button"
            className="button-main"
            onClick={() => {
              saveSettings({ ...loadSettings(), started: true });
              nav.swap({ name: 'today' });
            }}
          >
            Begin
          </button>
          <p className="fine">Your bills stay on this phone until you turn on sync.</p>
        </div>
      </div>
    </div>
  );
}
