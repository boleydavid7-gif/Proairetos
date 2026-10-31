import type { Nav } from '../app/App';
import { FamilyMark, MARK_LIGHT } from '../../app/family/marks';
import { scene } from '../app/scenes';
import { loadSettings, saveSettings } from '../data/store';
import { pendingInvite } from './SharedList';

/** The first screen: what this is, and one way in. */
export default function WelcomePage({ nav }: { nav: Nav }) {
  return (
    <div className="welcome">
      <picture>
        <source media="(min-width: 62rem)" srcSet={scene('soma-stoic-wide')} />
        <img className="welcome__image" src={scene('soma-stoic-wide')} alt="" fetchPriority="high" decoding="async" />
      </picture>
      <div className="welcome__shade" />
      <div className="welcome__content">
        <FamilyMark app="soma" size={48} color={MARK_LIGHT} />
        <h1 className="welcome__name">Soma</h1>
        <p className="welcome__about">
          Recipes, and a grocery list sorted by aisle.
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
            Begin
          </button>
        </div>
      </div>
    </div>
  );
}
