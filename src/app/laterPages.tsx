import { use, type ComponentType } from 'react';

type Loaded<P> = { default: ComponentType<P> };

// Pages away from the five tabs load when first opened, so the app opens sooner. Once it has settled,
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

export const OnboardingPage = later(() => import('../features/onboarding/OnboardingPage'));
export const ScheduleScreen = later(() => import('../features/schedule/ScheduleScreen'));
export const WeeklyReview = later(() => import('../features/review/WeeklyReview'));
export const SettingsPage = later(() => import('../features/settings/SettingsPage'));
export const JournalPage = later(() => import('../features/journal/JournalPage'));
export const InsightsPage = later(() => import('../features/insights/InsightsPage'));
export const MeditatePage = later(() => import('../features/meditate/MeditatePage'));

/** Fetches the later pages once the browser is idle (or after a few seconds where it cannot say). */
export function laterPages(): void {
  const fetchAll = () => {
    for (const page of [SettingsPage, MeditatePage, JournalPage, InsightsPage, WeeklyReview, ScheduleScreen]) page.fetch();
  };
  const idle = (window as { requestIdleCallback?: (run: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
  window.setTimeout(() => (idle ? idle(fetchAll, { timeout: 4000 }) : fetchAll()), 2500);
}
