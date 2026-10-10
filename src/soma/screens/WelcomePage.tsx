import type { Nav } from '../app/App';
import { Leaf } from '../app/icons';
import { scene } from '../app/scenes';
import { loadSettings, saveSettings } from '../data/store';
import { pendingInvite } from './SharedList';

/** The first screen: what this is, and one way in. */
export default function WelcomePage({ nav }: { nav: Nav }) {
  return (
    <div className="welcome">
      <img className="welcome__image" src={scene('sunset-valley')} alt="" />
      <div className="welcome__shade" />
      <div className="welcome__content">
        <Leaf size={64} color="#f1ece2" />
        <h1 className="welcome__name">SOMA</h1>
        <p className="welcome__by">by Proairetos</p>
        <p className="welcome__line">Real food. Simple choices.</p>
        <span className="welcome__rule" aria-hidden="true" />
        <p className="welcome__about">
          Your recipes in one place, a grocery list that sorts itself by aisle, and small ways to cook a little more simply when
          you want them.
        </p>
        <div className="welcome__actions">
          <button
            type="button"
            className="button-main"
            onClick={() => {
              saveSettings({ ...loadSettings(), started: true });
              // Opened from a shared list's invite: straight to it.
              nav.swap({ name: pendingInvite() ? 'groceries' : 'home' });
            }}
          >
            Get started
          </button>
          <p className="fine">Everything stays on this phone.</p>
        </div>
      </div>
    </div>
  );
}
