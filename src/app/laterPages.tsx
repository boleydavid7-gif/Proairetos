import { Suspense, use, type ComponentType } from 'react';

type Loaded<P> = { default: ComponentType<P> };

// Pages away from the main tabs load when first opened, so the app opens sooner. Once it has settled,
// they are fetched in the background, so opening one later is as quick as before (no empty moment).
function later<P extends object>(load: () => Promise<Loaded<P>>) {
  let fetched: Promise<Loaded<P>> | null = null;
  const fetchPage = (): Promise<Loaded<P>> => {
    if (!fetched) {
      const promise: Promise<Loaded<P>> = load().then((module) => {
        // Marked so React reads it at once next time instead of waiting a turn.
        Object.assign(promise, { status: 'fulfilled', value: module });
        return module;
      });
      // A page that could not be fetched (offline, say) is tried again when next opened.
      promise.catch(() => (fetched = null));
      fetched = promise;
    }
    return fetched;
  };
  function Later(props: P) {
    const Page = use(fetchPage()).default;
    return <Page {...props} />;
  }
  return Object.assign(Later, { fetch: () => void fetchPage().catch(() => undefined) });
}

/**
 * A sheet that opens on a tap loads the same way, but without a page's empty moment: until it has arrived it simply
 * is not there yet (no fallback), and after the idle fetch below it is already in hand.
 */
function laterSheet<P extends object>(load: () => Promise<Loaded<P>>) {
  const Inner = later<P>(load);
  function Sheet(props: P) {
    return (
      <Suspense fallback={null}>
        <Inner {...props} />
      </Suspense>
    );
  }
  return Object.assign(Sheet, { fetch: Inner.fetch });
}

export const ItemSheet = laterSheet(() => import('../features/items/ItemSheet'));
export const DecisionSheet = laterSheet(() => import('../features/decisions/DecisionSheet'));
export const SearchSheet = laterSheet(() => import('../features/search/SearchSheet'));
export const CommandPalette = laterSheet(() => import('./palette/CommandPalette'));
export const SharedSheet = laterSheet(() => import('../features/share/SharedSheet'));

export const OnboardingPage = later(() => import('../features/onboarding/OnboardingPage'));
export const ScheduleScreen = later(() => import('../features/schedule/ScheduleScreen'));
export const WeeklyReview = later(() => import('../features/review/WeeklyReview'));
export const SettingsPage = later(() => import('../features/settings/SettingsPage'));
export const JournalPage = later(() => import('../features/journal/JournalPage'));
export const InsightsPage = later(() => import('../features/insights/InsightsPage'));
export const MeditatePage = later(() => import('../features/meditate/MeditatePage'));
export const ConnectionsPage = later(() => import('../features/connections/ConnectionsPage'));

/** Fetches the later pages once the browser is idle (or after a few seconds where it cannot say). */
export function laterPages(): void {
  const fetchAll = () => {
    for (const page of [SettingsPage, MeditatePage, JournalPage, InsightsPage, WeeklyReview, ScheduleScreen, ConnectionsPage, ItemSheet, SearchSheet, DecisionSheet, CommandPalette, SharedSheet]) page.fetch();
  };
  const idle = (window as { requestIdleCallback?: (run: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
  window.setTimeout(() => (idle ? idle(fetchAll, { timeout: 4000 }) : fetchAll()), 2500);
}
