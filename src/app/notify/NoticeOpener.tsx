import { useEffect } from 'react';
import { setDaysAheadOpening } from '../../features/days/daysAhead';
import { useNavigate } from '../navigationContext';
import { useOverlays } from '../overlays/OverlayContext';

/** Where a tapped notification leads: `item:ID`, `day:YYYY-MM-DD`, `today`, `reflect`, or `askesis` (the training app). */
function useOpen() {
  const navigate = useNavigate();
  const { openItem } = useOverlays();
  return (open: string) => {
    if (open.startsWith('item:')) {
      navigate('today');
      openItem(open.slice(5));
    } else if (open.startsWith('day:')) {
      setDaysAheadOpening({ start: open.slice(4) });
      navigate('plan');
    } else if (open === 'reflect') navigate('reflect');
    else if (open === 'askesis') window.location.assign('/askesis/');
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
