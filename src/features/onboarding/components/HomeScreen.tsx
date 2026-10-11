import { useEffect, useState } from 'react';
import { INSTALL_STEPS, canPrompt, deviceKind, isInstalled, onPromptChange, promptInstall, type Device } from '../../../app/install/installPrompt';

const DEVICES: Device[] = ['iphone', 'android', 'computer'];

/** How to put Proairetos on the Home Screen, for this device first; the browser's Install where it offers one. */
export default function HomeScreen() {
  const touchMac = typeof navigator !== 'undefined' && /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
  const [device, setDevice] = useState<Device>(() => deviceKind(undefined, touchMac));
  const [prompt, setPrompt] = useState(canPrompt);
  const [installed, setInstalled] = useState(isInstalled);
  useEffect(() => onPromptChange(() => setPrompt(canPrompt())), []);

  if (installed) {
    return (
      <div className="make-yours home-screen">
        <p className="home-screen__done">Proairetos is on your Home Screen.</p>
      </div>
    );
  }

  return (
    <div className="make-yours home-screen">
      {prompt && (
        <button type="button" className="home-screen__install" onClick={() => void promptInstall().then((done) => done && setInstalled(true))}>
          Install Proairetos
        </button>
      )}
      <div className="make-yours__chips home-screen__devices" role="group" aria-label="Device">
        {DEVICES.map((each) => (
          <button key={each} type="button" className="make-yours__chip" aria-pressed={device === each} onClick={() => setDevice(each)}>
            {INSTALL_STEPS[each].name}
          </button>
        ))}
      </div>
      <ol className="home-screen__steps">
        {INSTALL_STEPS[device].steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <p className="home-screen__fine">It opens full screen, works offline and can send reminders.</p>
    </div>
  );
}
