import { useNavigate } from '../../app/navigationContext';
import { GearIcon } from '../icons/Icons';

export default function SettingsButton() {
  const navigate = useNavigate();
  return (
    <button type="button" className="header-action" aria-label="Settings" onClick={() => navigate('settings')}>
      <GearIcon size={22} />
    </button>
  );
}
