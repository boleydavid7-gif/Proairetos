import { useEffect, useState } from 'react';
import { INSTALL_STEPS, canPrompt, deviceKind, isInstalled, onPromptChange, promptInstall, type Device } from '../../app/install/installPrompt';

const DEVICES: Device[] = ['iphone', 'android', 'computer'];

export default function PwaInstallSection() {
  const touchMac = typeof navigator !== 'undefined' && /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
  const [device, setDevice] = useState<Device>(() => deviceKind(undefined, touchMac));
  const [prompt, setPrompt] = useState(canPrompt);
  const [installed, setInstalled] = useState(isInstalled);

  useEffect(() => onPromptChange(() => {
    setPrompt(canPrompt());
    setInstalled(isInstalled());
  }), []);

  return (
    <section className="settings-card pwa-install" aria-label="Install Proairetos">
      <p className="section-label">Install Proairetos</p>
      {installed ? (
        <p className="sheet__hint" role="status">Proairetos is already on this device’s Home Screen.</p>
      ) : (
        <>
          {prompt && (
            <button
              type="button"
              className="chip chip--accent chip--wide"
              onClick={() => void promptInstall().then((done) => done && setInstalled(true))}
            >
              Install Proairetos
            </button>
          )}
          <div className="pwa-install__devices" role="group" aria-label="Device">
            {DEVICES.map((each) => (
              <button key={each} type="button" className="chip" aria-pressed={device === each} onClick={() => setDevice(each)}>
                {INSTALL_STEPS[each].name}
              </button>
            ))}
          </div>
          <ol className="pwa-install__steps">
            {INSTALL_STEPS[device].steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </>
      )}
    </section>
  );
}
