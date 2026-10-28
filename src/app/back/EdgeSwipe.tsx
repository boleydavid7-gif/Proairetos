import { useEffect } from 'react';
import { setSwipeBack } from '../../lamplight/behaviors';
import { canGoBack, goBack } from './backStack';
import { depthFromHistoryState } from '../routes/browserRoutes';

/**
 * Swipe from the left edge to go back, in the installed app (iPhone home-screen apps have no back gesture of their
 * own). Lamplight's back swipe (lamplight/behaviors.ts) does the gesture, the page following the finger; here it is
 * told that Proairetos's back is its stack of sheets and sub-screens, then the places it came through.
 */
export default function EdgeSwipe() {
  useEffect(() => {
    // A sheet or sub-view first; else the place before this one, when it was the app's own.
    setSwipeBack({
      can: () => canGoBack() || depthFromHistoryState(history.state) > 0,
      back: () => {
        if (!goBack()) history.back();
      },
    });
    return () => setSwipeBack(undefined);
  }, []);

  return null;
}
