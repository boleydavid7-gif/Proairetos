import { useEffect, useState } from 'react';
import type { Nav } from '../app/App';
import { BackLink } from '../app/ui';
import { askesisCapabilities, type AskesisCapabilities, type NativeCapability } from '../app/capabilities';

const platformName = (platform: AskesisCapabilities['platform']) =>
  platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'Browser';

const bridgeLabel = (status: AskesisCapabilities['bridgeStatus']) => {
  if (status === 'connected') return 'Bridge detected';
  if (status === 'incompatible') return 'Bridge update needed';
  if (status === 'missing') return 'Phone shell · no bridge';
  return 'Browser mode';
};

const nativeFeatures: { key: NativeCapability; flag: keyof Pick<AskesisCapabilities, 'healthWorkouts' | 'healthHeartRate' | 'backgroundGps' | 'haptics' | 'lockScreenControls' | 'watchSync'>; title: string; detail: string }[] = [
  { key: 'healthWorkouts', flag: 'healthWorkouts', title: 'Health workouts', detail: 'Read completed runs and other workouts from Apple Health or Health Connect.' },
  { key: 'heartRate', flag: 'healthHeartRate', title: 'Health heart rate', detail: 'Use heart-rate records from the phone’s health platform.' },
  { key: 'backgroundGps', flag: 'backgroundGps', title: 'Background GPS', detail: 'Continue recording a run when the screen is locked.' },
  { key: 'haptics', flag: 'haptics', title: 'Native haptics', detail: 'Use the phone’s vibration and haptic controls during a guided session.' },
  { key: 'lockScreenControls', flag: 'lockScreenControls', title: 'Lock-screen controls', detail: 'See and control an active session without reopening Askesis.' },
  { key: 'watchSync', flag: 'watchSync', title: 'Watch sync', detail: 'Receive supported workout records from a paired watch.' },
];

export default function DevicePage({ nav }: { nav: Nav }) {
  const [capabilities, setCapabilities] = useState<AskesisCapabilities>();
  const [loading, setLoading] = useState(true);

  const check = async (refresh = false) => {
    setLoading(true);
    try {
      setCapabilities(await askesisCapabilities(refresh));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let live = true;
    void askesisCapabilities().then((value) => {
      if (live) {
        setCapabilities(value);
        setLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, []);

  const status = capabilities?.bridgeStatus;
  const supported = capabilities?.provider === 'native';

  return (
    <div className="page device-page">
      <BackLink label="More" onBack={nav.back} />
      <h1 className="title">Device integrations</h1>
      <p className="lead">Optional phone features can add to Askesis. The browser experience remains complete without them.</p>

      <section className="card device-bridge">
        <div className="device-bridge__head">
          <div>
            <span className="card__eyebrow">{capabilities ? platformName(capabilities.platform) : 'Checking device'}</span>
            <h2 className="card__title card__title--small">{capabilities ? bridgeLabel(capabilities.bridgeStatus) : 'Checking for a phone bridge'}</h2>
          </div>
          <span className={`device-bridge__state${supported ? ' device-bridge__state--ready' : ''}`}>
            {loading ? 'Checking' : supported ? 'Connected' : 'Optional'}
          </span>
        </div>
        {status === 'missing' && (
          <p className="muted">The phone app is present, but its optional Askesis bridge is not installed. Nothing in the web app is disabled.</p>
        )}
        {status === 'incompatible' && (
          <p className="muted">The installed bridge uses a different protocol version. Askesis has safely stayed with its web capabilities.</p>
        )}
        {status === 'connected' && (
          <p className="muted">The bridge reports which device features it can provide. Health permissions are separate and are only requested when you choose to connect a feature.</p>
        )}
        {status === 'web' && (
          <p className="muted">You are using Askesis in a browser. Its web tools work without installing a phone app.</p>
        )}
        <button type="button" className="text-link" disabled={loading} onClick={() => void check(true)}>
          Check again
        </button>
      </section>

      <section className="device-section">
        <h2 className="label">Available without a phone bridge</h2>
        <div className="card device-list">
          <div className="device-row">
            <span className="device-row__title">Guided sessions, timer and audio cues</span>
            <span className="device-row__status">Available</span>
          </div>
          <div className="device-row">
            <span className="device-row__title">Manual heart-rate entry</span>
            <span className="device-row__status">Available</span>
          </div>
          <div className="device-row">
            <span className="device-row__title">GPX and TCX watch-file import</span>
            <span className="device-row__status">Available</span>
          </div>
          <div className="device-row">
            <span className="device-row__title">Foreground GPS distance</span>
            <span className="device-row__status">{capabilities?.foregroundGps ? 'Supported' : loading ? 'Checking' : 'Browser unavailable'}</span>
          </div>
        </div>
      </section>

      <section className="device-section">
        <h2 className="label">Optional phone capabilities</h2>
        <div className="card device-list">
          {nativeFeatures.map((feature) => {
            const enabled = capabilities?.[feature.flag] === true;
            return (
              <div className="device-row" key={feature.key}>
                <div className="device-row__copy">
                  <span className="device-row__title">{feature.title}</span>
                  <span className="device-row__detail">{feature.detail}</span>
                </div>
                <span className={`device-row__status${enabled ? ' device-row__status--ready' : ''}`}>
                  {loading ? 'Checking' : enabled ? 'Supported' : status === 'connected' ? 'Not offered' : 'Phone bridge'}
                </span>
              </div>
            );
          })}
        </div>
        <p className="hint">Support means the bridge can provide a capability; it does not mean health access has been granted or data is being read.</p>
      </section>
    </div>
  );
}
