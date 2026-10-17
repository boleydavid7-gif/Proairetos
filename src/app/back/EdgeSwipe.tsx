import { useEffect } from 'react';
import { setSwipeBack } from '../../lamplight/behaviors';
import { canGoBack, goBack } from './backStack';

/**
 * Swipe from the left edge to go back, in the installed app (iPhone home-screen apps have no back gesture of their
 * own). Lamplight's back swipe (lamplight/behaviors.ts) does the gesture, the page following the finger; here it is
 * told that Proairetos's back is its stack of sheets and sub-screens.
 */
export default function EdgeSwipe() {
  useEffect(() => {
    setSwipeBack({ can: canGoBack, back: () => void goBack() });
    return () => setSwipeBack(undefined);
  }, []);

  return null;
}
