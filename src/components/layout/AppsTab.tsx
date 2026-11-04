import { useState } from 'react';
import { useNavigate } from '../../app/navigationContext';
import { openSettingsAt } from '../../features/settings/settingsViews';
import { useSheet } from '../ui/useSheet';
import { familyApps } from '../../app/family/FamilyApps';
import { pinApp, unpinApp, useAddedApps, usePinnedApps } from '../../app/family/added';
import { LampIcon, Sym } from '../../lamplight/icons';

export function AppsIcon({ size = 22 }: { size?: number }) {
  return (
    <LampIcon
      size={size}
      glyph={{ line: <>{[5, 12, 19].flatMap((x) => [5, 12, 19].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.7} fill="currentColor" stroke="none" />))}</>, lit: <></> }}
    />
  );
}

function AppsSheet({ onClose, onStore }: { onClose: () => void; onStore: () => void }) {
  const { dialog, panel, close } = useSheet({ from: 'top' });
  const added = useAddedApps();
  const pinned = usePinnedApps();
  const apps = familyApps.filter((app) => added.includes(app.id as never));
  return (
    <dialog ref={dialog} className="sheet sheet--top" aria-label="Your apps" onClose={onClose} onClick={(event) => event.target === dialog.current && close()}>
      <div ref={panel} className="sheet__panel">
        <button type="button" className="sheet__close" onClick={close}>
          Close
        </button>
        <p className="sheet__title sheet__title--static">All apps</p>
        <p className="sheet__hint">Pin an installed app to keep it in the dock.</p>
        <ul className="apps-grid">
          {apps.map((app) => (
            <li key={app.id} className="apps-grid__managed">
              <a className="apps-grid__app" href={app.href}>
                <img src={app.icon} alt="" width={52} height={52} />
                <span>{app.name}</span>
              </a>
              <button type="button" className="text-link" onClick={() => (pinned.includes(app.id as never) ? unpinApp(app.id as never) : pinApp(app.id as never))}>
                {pinned.includes(app.id as never) ? 'Unpin' : 'Pin'}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="apps-grid__app"
              onClick={() => {
                close();
                onStore();
              }}
            >
              <span className="apps-grid__store" aria-hidden="true"><Sym name="plus" /></span>
              <span>Store</span>
            </button>
          </li>
        </ul>
        <div className="sheet__grabber sheet__grabber--foot" aria-hidden="true" />
      </div>
    </dialog>
  );
}

/** Apps, the last place on the bar: the added apps and the Store, in a sheet. */
export default function AppsTab() {
  const navigate = useNavigate();
  const pinned = usePinnedApps();
  const apps = familyApps.filter((app) => app.id !== 'proairetos' && pinned.includes(app.id as never));
  return (
    <>
      <div className="tab-bar__pinned" aria-label="Pinned apps">
        <span className="tab-bar__section-label">Pinned apps</span>
        {apps.map((app) => <a className="tab-bar__pinned-app" key={app.id} href={app.href}><img src={app.icon} alt="" width={22} height={22} /><span>{app.name}</span></a>)}
        <a className="tab-bar__pinned-app tab-bar__pinned-store" href="/?open=settings:store"><Sym name="plus" size={20} /><span>App Store</span></a>
      </div>
      <AllAppsTrigger onStore={() => { openSettingsAt('store'); navigate('settings'); }} />
    </>
  );
}

export function AllAppsTrigger({ onStore = () => window.location.assign('/?open=settings:store'), desktopOnly = false }: { onStore?: () => void; desktopOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`tab-bar__item tab-bar__apps-trigger${desktopOnly ? ' tab-bar__desktop-only' : ''}`} data-to-header="" aria-label="Apps" title="All apps" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <AppsIcon size={24} />
        <span>All apps</span>
      </button>
      {open && <AppsSheet onClose={() => setOpen(false)} onStore={onStore} />}
    </>
  );
}
