import { useState } from 'react';
import { useNavigate } from '../../app/navigationContext';
import { openSettingsAt } from '../../features/settings/settingsViews';
import { useSheet } from '../ui/useSheet';
import { familyApps } from '../../app/family/FamilyApps';
import { useAddedApps } from '../../app/family/added';
import { LampIcon, Sym } from '../../lamplight/icons';

export function AppsIcon({ size = 22 }: { size?: number }) {
  return (
    <LampIcon
      size={size}
      glyph={{ line: <>{[5, 12, 19].flatMap((x) => [5, 12, 19].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.7} fill="currentColor" stroke="none" />))}</>, lit: <></> }}
    />
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
              <span className="apps-grid__store" aria-hidden="true"><Sym name="plus" /></span>
              <span>Store</span>
            </button>
          </li>
        </ul>
      </div>
    </dialog>
  );
}

/** Apps, the last place on the bar: the added apps and the Store, in a sheet. */
export default function AppsTab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="tab-bar__item" data-to-header="" aria-label="Apps" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <AppsIcon size={24} />
        <span>Apps</span>
      </button>
      {open && <AppsSheet onClose={() => setOpen(false)} />}
    </>
  );
}
