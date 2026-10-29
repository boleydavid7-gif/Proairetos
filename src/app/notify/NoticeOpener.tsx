import { useEffect } from 'react';
import { setDaysAheadOpening } from '../../features/days/daysAhead';
import { useNavigate } from '../navigationContext';
import { useOverlays } from '../overlays/OverlayContext';
import { openSettingsAt } from '../../features/settings/settingsViews';
import { linkTo } from '../family/opening';
import { placeFor } from '../../core/notify/place';

/**
 * Where a tapped notification, or a link from Askesis or Soma, leads:
 * `item:ID`, `day:YYYY-MM-DD` (or `day:today`), `today`, `reflect`,
 * `compass`, `account` (Settings, sync), `askesis` (the training app), or `oikonomia:bill:ID`.
 */
export function useNoticeOpen() {
  const navigate = useNavigate();
  const { openItem } = useOverlays();
  const openRoute = (route: Parameters<typeof navigate>[0]) => navigate(route, { immediate: true });
  return (open: string) => {
    if (open.startsWith('item:')) {
      openRoute('today');
      openItem(open.slice(5));
    } else if (open.startsWith('day:')) {
      const day = open.slice(4);
      if (day !== 'today') setDaysAheadOpening({ start: day });
      openRoute('plan');
    } else if (open === 'reflect') openRoute('reflect');
    else if (open === 'compass') openRoute('compass');
    else if (open === 'settings') openRoute('settings');
    else if (open.startsWith('settings:')) {
      openSettingsAt(open.slice(9) as Parameters<typeof openSettingsAt>[0]);
      openRoute('settings');
    } else if (open === 'hydros') window.location.assign('/hydros/');
    else if (open === 'praxis') window.location.assign('/theoria/?open=pomodoro');
    else if (open === 'account') {
      openSettingsAt('account');
      openRoute('settings');
    } else if (open === 'askesis') window.location.assign('/askesis/');
    else if (open.startsWith('oikonomia:')) window.location.assign(linkTo('oikonomia', open.slice(10)));
    else if (placeFor(open).app !== '/') window.location.assign(placeFor(open).url);
    else openRoute('today');
  };
}

/** Follows a tapped notification: from the address when the app was closed, or a message when it was open. */
export default function NoticeOpener() {
  const open = useNoticeOpen();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('open');
    if (target) {
      // The fragment stays: it can carry an answer for the page being opened (storage connected).
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
      // A companion app can have just handed the browser to this document. Open the route immediately so it does not
      // compete with the browser's navigation transition.
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
