import { useEffect } from 'react';
import { setDaysAheadOpening } from '../../features/days/daysAhead';
import { useNavigate } from '../navigationContext';
import { useOverlays } from '../overlays/OverlayContext';
import { openSettingsAt } from '../../features/settings/SettingsPage';
import { linkTo } from '../family/opening';

/**
 * Where a tapped notification, or a link from Askesis or SOMA, leads:
 * `item:ID`, `day:YYYY-MM-DD` (or `day:today`), `today`, `reflect`,
 * `compass`, `account` (Settings, sync), `askesis` (the training app), or `oikonomia:bill:ID`.
 */
function useOpen() {
  const navigate = useNavigate();
  const { openItem } = useOverlays();
  return (open: string) => {
    if (open.startsWith('item:')) {
      navigate('today');
      openItem(open.slice(5));
    } else if (open.startsWith('day:')) {
      const day = open.slice(4);
      if (day !== 'today') setDaysAheadOpening({ start: day });
      navigate('plan');
    } else if (open === 'reflect') navigate('reflect');
    else if (open === 'compass') navigate('compass');
    else if (open === 'settings') navigate('settings');
    else if (open === 'account') {
      openSettingsAt('account');
      navigate('settings');
    } else if (open === 'askesis') window.location.assign('/askesis/');
    else if (open.startsWith('oikonomia:')) window.location.assign(linkTo('oikonomia', open.slice(10)));
    else navigate('today');
  };
}

/** Follows a tapped notification: from the address when the app was closed, or a message when it was open. */
export default function NoticeOpener() {
  const open = useOpen();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('open');
    if (target) {
      window.history.replaceState(null, '', window.location.pathname);
      open(target);
    }
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'open' && typeof event.data.open === 'string') open(event.data.open);
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
    // Read once when the app opens; messages keep arriving through the listener.
  }, []);
  return null;
}
