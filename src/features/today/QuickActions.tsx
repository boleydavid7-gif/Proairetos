import type { ComponentType } from 'react';
import { useNavigate } from '../../app/navigationContext';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { BookIcon, BreatheIcon, CalendarIcon, HourglassIcon } from '../../components/icons/Icons';

type Action = { label: string; icon: ComponentType<{ size?: number }>; run: () => void };

/** Four doors from Today: start a focus session, pause, reflect, or open the schedule. */
export default function QuickActions() {
  const navigate = useNavigate();
  const { startFocus, openPause } = useOverlays();
  const actions: Action[] = [
    { label: 'Focus', icon: HourglassIcon, run: () => startFocus() },
    { label: 'Pause', icon: BreatheIcon, run: openPause },
    { label: 'Reflect', icon: BookIcon, run: () => navigate('reflect') },
    { label: 'Schedule', icon: CalendarIcon, run: () => navigate('schedule') },
  ];

  return (
    <nav className="quick-actions" aria-label="Quick actions">
      {actions.map(({ label, icon: Icon, run }) => (
        <button key={label} type="button" className="quick-action" onClick={run}>
          <Icon size={26} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
