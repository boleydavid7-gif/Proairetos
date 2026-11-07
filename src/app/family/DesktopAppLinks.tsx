import { familyApps } from './FamilyApps';
import { usePinnedApps } from './added';
import { Sym } from '../../lamplight/icons';

/** Desktop-only navigation content shared by the older app shells. */
export default function DesktopAppLinks() {
  const pinnedIds = usePinnedApps();
  const pinned = familyApps.filter((app) => app.id !== 'proairetos' && pinnedIds.includes(app.id as never));
  return (
    <>
      <a className="tab-bar__search" href="/?open=search" aria-label="Search"><Sym name="search" size={22} /><span>Search</span><kbd>⌘ K</kbd></a>
      <span className="tab-bar__section-label">Workspace</span>
      <div className="tab-bar__pinned" aria-label="Pinned apps">
        <span className="tab-bar__section-label">Pinned apps</span>
        {pinned.map((app) => <a className="tab-bar__pinned-app" href={app.href} key={app.id}><img src={app.icon} alt="" width={22} height={22} /><span>{app.name}</span></a>)}
        <a className="tab-bar__pinned-app tab-bar__pinned-store" href="/?open=settings:store"><Sym name="plus" size={20} /><span>App Store</span></a>
      </div>
      <span className="tab-bar__section-label tab-bar__resources-label">Resources</span>
      <a className="tab-bar__pinned-app tab-bar__desktop-only" href="/?open=account"><Sym name="gear" size={21} /><span>Settings</span></a>
    </>
  );
}
