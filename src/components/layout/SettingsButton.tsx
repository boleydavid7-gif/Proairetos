import { useSyncExternalStore } from 'react';
import { useNavigate } from '../../app/navigationContext';
import { displayName, subscribePreferences } from '../../data/storage/preferences';
import { GearIcon } from '../icons/Icons';
import { IconButton } from '../../lamplight/icons';

/**
 * Settings opens from the person’s own initial, top right, as in Apple's apps (the App Store, Music, Health):
 * a round button that reads as "you and your setup". Without a name it is the gear in the same circle.
 */
export default function SettingsButton() {
  const navigate = useNavigate();
  const name = useSyncExternalStore(subscribePreferences, displayName);
  const initial = name.trim().charAt(0).toLocaleUpperCase();
  return (
    <IconButton label="Settings" className="header-action profile-button" onClick={() => navigate('settings')}>
      <span className="profile-button__face" aria-hidden="true">
        {initial || <GearIcon size={18} />}
      </span>
    </IconButton>
  );
}
