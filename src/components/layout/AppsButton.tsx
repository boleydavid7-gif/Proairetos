import { useState } from 'react';
import { useNavigate } from '../../app/navigationContext';
import { openSettingsAt } from '../../features/settings/SettingsPage';
import { useSheet } from '../ui/useSheet';
import { familyApps } from '../../app/family/FamilyApps';
import { useAddedApps } from '../../app/family/added';

function AppsIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
      {[5, 12, 19].flatMap((x) => [5, 12, 19].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} />))}
    </svg>
  );
}

function AppsSheet({ onClose }: { onClose: () => void }) {
  const { dialog, panel, close } = useSheet();
  const navigate = useNavigate();
  const added = useAddedApps();
  const apps = familyApps.filter((app) => added.includes(app.id as never));
  return (
    <dialog ref={dialog} className="sheet" aria-label="Your apps" onClose={onClose} onClick={(event) => event.target === dialog.current && close()}>
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={close}>
          Close
        </button>
        <p className="sheet__title sheet__title--static">Your apps</p>
        <ul className="apps-grid">
          {apps.map((app) => (
            <li key={app.id}>
              <a className="apps-grid__app" href={app.href}>
                <img src={app.icon} alt="" width={52} height={52} />
                <span>{app.name}</span>
              </a>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="apps-grid__app"
              onClick={() => {
                openSettingsAt('store');
                close();
                navigate('settings');
              }}
            >
              <span className="apps-grid__store" aria-hidden="true">+</span>
              <span>Store</span>
            </button>
          </li>
        </ul>
      </div>
    </dialog>
  );
}

/** The added apps and the Store, beside the gear. */
export default function AppsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="header-action" aria-label="Your apps" onClick={() => setOpen(true)}>
        <AppsIcon />
      </button>
      {open && <AppsSheet onClose={() => setOpen(false)} />}
    </>
  );
}
