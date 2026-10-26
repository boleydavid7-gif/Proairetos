import type { Nav } from '../app/App';
import heroImage from '../../assets/images/scenes/oikonomia-stoic.webp';
import heroWide from '../../assets/images/scenes/oikonomia-stoic-wide.webp';
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
        <ArchMark size={48} light />
        <h1 className="welcome__name">Oikonomia</h1>
        <p className="welcome__about">
          Bills and subscriptions, with their dates and a reminder before each one.
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
        </div>
      </div>
    </div>
  );
}
