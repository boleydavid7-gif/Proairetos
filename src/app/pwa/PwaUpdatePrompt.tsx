import { useEffect, useState } from 'react';

/** Shows a small reload action after an existing page has been taken over by a newer worker. */
export default function PwaUpdatePrompt() {
  const [ready, setReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | undefined>();

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;
    const hadController = Boolean(navigator.serviceWorker.controller);
    let active = true;
    const onControllerChange = () => {
      if (hadController) setReady(true);
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    void navigator.serviceWorker.getRegistration().then((current) => {
      if (!active || !current) return;
      setRegistration(current);
      if (hadController && current.waiting) setReady(true);
    });

    return () => {
      active = false;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  if (!ready) return null;
  return (
    <div className="pwa-update" role="status">
      <span>Update ready</span>
      <button
        type="button"
        className="pwa-update__button"
        onClick={() => {
          registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }}
      >
        Reload
      </button>
    </div>
  );
}
