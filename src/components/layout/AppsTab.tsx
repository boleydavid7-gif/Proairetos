import { useState, useSyncExternalStore } from 'react';
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

/** From this width the tab bar is a side rail with a dock of pinned apps; below it (phones, tablets) there is no dock. Matches `37-desktop-dock.css`. */
const DESKTOP_DOCK = '(min-width: 62rem)';

function subscribeDesktopDock(listener: () => void): () => void {
  if (typeof matchMedia !== 'function') return () => undefined;
  const query = matchMedia(DESKTOP_DOCK);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

/** Whether the dock exists here. Managing it is offered only where it does; everywhere else Apps is the plain grid of added apps. */
function useDesktopDock(): boolean {
  return useSyncExternalStore(
    subscribeDesktopDock,
    () => typeof matchMedia === 'function' && matchMedia(DESKTOP_DOCK).matches,
    () => false,
  );
}

function AppsSheet({ onClose, onStore, dock }: { onClose: () => void; onStore: () => void; dock: boolean }) {
  const { dialog, panel, close } = useSheet({ from: 'top' });
  const added = useAddedApps();
  const pinned = usePinnedApps();
  const apps = familyApps.filter((app) => added.includes(app.id as never));
  return (
    <dialog ref={dialog} className="sheet sheet--top" aria-label={dock ? 'Manage dock' : 'Your apps'} onClose={onClose} onClick={(event) => event.target === dialog.current && close()}>
      <div ref={panel} className="sheet__panel">
        <button type="button" className="sheet__close" onClick={close}>
          Close
        </button>
        <p className="sheet__title sheet__title--static">{dock ? 'Manage dock' : 'All apps'}</p>
        <ul className="apps-grid">
          {apps.map((app) => (
            <li key={app.id} className="apps-grid__managed">
              <a className="apps-grid__app" href={app.href}>
                <img src={app.icon} alt="" width={52} height={52} />
                <span>{app.name}</span>
              </a>
              {dock && (
                <button type="button" className="text-link apps-grid__pin" onClick={() => (pinned.includes(app.id as never) ? unpinApp(app.id as never) : pinApp(app.id as never))}>
                  {pinned.includes(app.id as never) ? 'Remove from dock' : 'Add to dock'}
                </button>
              )}
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
              <span className="apps-grid__store" aria-hidden="true"><Sym name="basket" /></span>
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
        <a className="tab-bar__pinned-app tab-bar__pinned-store" href="/?open=settings:store"><Sym name="basket" size={20} /><span>App Store</span></a>
      </div>
      <AllAppsTrigger onStore={() => { openSettingsAt('store'); navigate('settings'); }} />
    </>
  );
}

export function AllAppsTrigger({ onStore = () => window.location.assign('/?open=settings:store'), desktopOnly = false }: { onStore?: () => void; desktopOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const dock = useDesktopDock();
  return (
    <>
      <button
        type="button"
        className={`tab-bar__item tab-bar__apps-trigger${desktopOnly ? ' tab-bar__desktop-only' : ''}`}
        data-to-header=""
        aria-label={dock ? 'Manage dock' : 'Apps'}
        title={dock ? 'Manage dock' : 'All apps'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {dock ? <Sym name="plus" size={24} /> : <AppsIcon size={24} />}
        <span>{dock ? 'Manage dock' : 'All apps'}</span>
      </button>
      {open && <AppsSheet onClose={() => setOpen(false)} onStore={onStore} dock={dock} />}
    </>
  );
}
