/**
 * Proairetos's service worker (scope /) is the one that shows notices, answers a tap on one, and receives
 * push. Some apps of the family have their own worker for their pages (HYDROS, Askesis, SOMA, Oikonomia);
 * notices and push must still go through this one, or a push would arrive at a worker that cannot show it.
 */
export async function familyWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;
  const scope = `${location.origin}/`;
  let registration = (await navigator.serviceWorker.getRegistrations().catch(() => [])).find((each) => each.scope === scope);
  registration ??= await navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
  if (!registration) return undefined;
  if (!registration.active) {
    const worker = registration.installing ?? registration.waiting;
    if (worker) {
      await new Promise<void>((resolve) => {
        const done = () => worker.state === 'activated' && resolve();
        worker.addEventListener('statechange', done);
        window.setTimeout(resolve, 10_000);
      });
    }
  }
  return registration;
}
