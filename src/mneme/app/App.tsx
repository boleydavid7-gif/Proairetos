import { useEffect } from 'react';
import { startSync } from '../../app/sync/syncController';
import { takeOpening } from '../../app/family/opening';
import { Brand, Shell, useRoutes, type Nav, type TabDef } from '../../app/family/shell';
import { BookIcon, BoxIcon, LeafIcon, PlusIcon, SettingsIcon } from '../../app/family/icons';
import { AppMark } from '../../app/family/icons';
import NotesPage from '../screens/NotesPage';
import CollectionsPage from '../screens/CollectionsPage';
import CapturePage from '../screens/CapturePage';
import NotePage from '../screens/NotePage';
import IdeasPage from '../screens/IdeasPage';
import MorePage from '../screens/MorePage';

export type Tab = 'notes' | 'ideas' | 'collections' | 'capture' | 'more';
export type Route = { name: Exclude<Tab, 'capture'> } | { name: 'capture'; mode?: 'write' | 'record' } | { name: 'note'; id: string } | { name: 'collection'; id: string };
export type MnemeNav = Nav<Route>;

const tabs: readonly TabDef<Tab>[] = [
  { id: 'notes', label: 'Notes', Icon: BookIcon },
  { id: 'ideas', label: 'Ideas', Icon: LeafIcon },
  { id: 'collections', label: 'Collections', Icon: BoxIcon },
  { id: 'capture', label: 'Capture', Icon: PlusIcon },
  { id: 'more', label: 'More', Icon: SettingsIcon },
];
const tabNames = tabs.map((tab) => tab.id) as string[];

export function MnemeBrand() {
  return <Brand name="Mneme" mark={<AppMark app="mneme" size={28} />} />;
}

function firstRoute(): Route {
  const opening = takeOpening();
  if (opening?.startsWith('note:')) return { name: 'note', id: opening.slice(5) };
  if (opening?.startsWith('collection:')) return { name: 'collection', id: opening.slice(11) };
  if (opening === 'capture') return { name: 'capture' };
  if (opening && tabNames.includes(opening)) return { name: opening as Tab };
  return { name: 'notes' };
}

export default function App() {
  const { route, nav, isTab } = useRoutes<Route>('mneme', tabNames, firstRoute, { name: 'notes' });

  useEffect(() => { void startSync(); }, []);

  const page = (() => {
    switch (route.name) {
      case 'notes': return <NotesPage nav={nav} />;
      case 'ideas': return <IdeasPage />;
      case 'more': return <MorePage />;
      case 'collections': return <CollectionsPage nav={nav} />;
      case 'capture': return <CapturePage nav={nav} initialMode={route.mode} />;
      case 'note': return <NotePage nav={nav} id={route.id} />;
      case 'collection': return <CollectionsPage nav={nav} id={route.id} />;
    }
  })();

  return (
    <Shell
      page={page}
      routeKey={JSON.stringify(route)}
      tabs={tabs}
      current={isTab ? route.name as Tab : undefined}
      onPick={(tab) => nav.swap({ name: tab })}
      showTabs={isTab}
    />
  );
}
