import { useSyncExternalStore } from 'react';
import { useNavigate } from '../../app/navigationContext';
import { displayName, subscribePreferences } from '../../data/storage/preferences';
import { GearIcon } from '../icons/Icons';

/**
 * Settings opens from the person’s own initial, top right, as in Apple's apps (the App Store, Music, Health):
 * a round button that reads as "you and your setup". Without a name it is the gear in the same circle.
 */
export default function SettingsButton() {
  const navigate = useNavigate();
  const name = useSyncExternalStore(subscribePreferences, displayName);
  const initial = name.trim().charAt(0).toLocaleUpperCase();
  return (
    <button type="button" className="header-action profile-button" aria-label="Settings" onClick={() => navigate('settings')}>
      <span className="profile-button__face" aria-hidden="true">
        {initial || <GearIcon size={18} />}
      </span>
    </button>
  );
}
