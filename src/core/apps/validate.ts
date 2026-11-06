import { APPS, type AppManifest } from './manifest';

/*
 * What is wrong with the manifest itself. Errors stop the build (a required fact is missing or two apps claim the same
 * thing); warnings say what is merely not there yet (a note on what an app reads and writes, for instance).
 */

export type Findings = { errors: string[]; warnings: string[] };

const PRIVACY = ['private', 'own-search', 'shared'];
const CAPABILITIES = ['library', 'search', 'calendar', 'notices', 'home'];

const duplicates = (values: readonly string[]): string[] => values.filter((value, index) => values.indexOf(value) !== index);

export function validateManifest(apps: readonly AppManifest[] = APPS): Findings {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = apps.map((app) => app.id);
  for (const id of new Set(duplicates(ids))) errors.push(`${id}: listed more than once`);
  if (apps.filter((app) => app.status === 'main').length !== 1) errors.push('exactly one app must be the main app');

  const claim = (label: string, values: readonly (string | undefined)[]) => {
    for (const value of new Set(duplicates(values.filter((each): each is string => Boolean(each))))) errors.push(`${label} "${value}" is claimed by more than one app`);
  };
  claim('address', apps.map((app) => app.urls.href));
  claim('entry', apps.map((app) => app.urls.entry));
  claim('backup prefix', apps.map((app) => app.data.backupPrefix));
  claim('reminder source', apps.map((app) => app.notices.source));
  claim('notice kind', apps.flatMap((app) => app.notices.kinds));
  claim('notice switch', apps.flatMap((app) => app.notices.switches.map((each) => each.key)));
  claim('Today part', apps.flatMap((app) => app.today?.parts ?? []));
  claim('notifications page place', apps.map((app) => (app.notices.page === undefined ? undefined : String(app.notices.page))));
  for (const group of ['practice', 'attention'] as const) {
    claim(`Today ${group} place`, apps.filter((app) => app.today?.group === group).map((app) => String(app.today?.order)));
  }

  for (const app of apps) {
    const at = app.id;
    if (!app.name.trim()) errors.push(`${at}: no name`);
    if (!app.line.trim()) errors.push(`${at}: no line`);
    const expected = app.status === 'main' ? '/' : `/${app.id}/`;
    if (app.urls.href !== expected) errors.push(`${at}: its address is ${app.urls.href}, expected ${expected}`);
    if (app.urls.scope !== app.urls.href) errors.push(`${at}: its scope ${app.urls.scope} differs from its address`);
    if (app.status === 'retired') {
      if (!app.aliasOf) errors.push(`${at}: a retired app keeps its identity through aliasOf`);
      if (app.install.addable) errors.push(`${at}: a retired app cannot be addable`);
    }
    if (app.aliasOf) {
      const target = apps.find((each) => each.id === app.aliasOf);
      if (!target) errors.push(`${at}: aliasOf ${app.aliasOf} is not in the manifest`);
      else if (target.status !== 'active') errors.push(`${at}: aliasOf ${app.aliasOf} must be an active app`);
    }
    if (app.install.addable) {
      if (app.status !== 'active') errors.push(`${at}: only an active app can be addable`);
      if (!app.about?.trim()) errors.push(`${at}: an addable app needs the sentence the Store shows (about)`);
      if (!app.tint) errors.push(`${at}: an addable app needs its Store colors (tint)`);
    }
    if (app.notices.source && !app.notices.kinds.length && app.status !== 'main') errors.push(`${at}: a reminder source with no notice kinds`);
    if (app.notices.mainWrites && !app.notices.source) errors.push(`${at}: Proairetos cannot write a source the app does not have`);
    if (app.today?.group && app.today.order === undefined) errors.push(`${at}: a Today group needs a place`);
    if (app.search) {
      if (!PRIVACY.includes(app.search.privacy)) errors.push(`${at}: unknown search privacy class ${app.search.privacy}`);
      if (!app.search.excludes.length) errors.push(`${at}: a search entry must say what it excludes`);
      // A private classification indexes nothing, so it may list no fields.
      if (!app.search.indexes.length && app.search.privacy !== 'private') errors.push(`${at}: a search entry must say what it indexes`);
      if (app.search.privacy === 'private' && app.search.indexes.length) errors.push(`${at}: a private search entry cannot index fields`);
      for (const field of app.search.indexes) if (app.search.excludes.includes(field)) errors.push(`${at}: search field "${field}" is both indexed and excluded`);
      if (app.search.windowDays !== undefined && !(app.search.windowDays > 0)) errors.push(`${at}: search windowDays must be a positive number`);
    }
    for (const capability of app.provides ?? []) {
      if (!CAPABILITIES.includes(capability)) errors.push(`${at}: unknown capability ${capability}`);
      if (app.status === 'retired') errors.push(`${at}: a retired app cannot provide ${capability}`);
      if (capability === 'search' && !app.search) errors.push(`${at}: it provides search, so it must classify its search fields`);
    }
    for (const link of app.details?.connects ?? []) {
      if (!apps.some((each) => each.id === link.app)) errors.push(`${at}: connects to ${link.app}, which is not in the manifest`);
      if (link.app === app.id) errors.push(`${at}: connects to itself`);
    }
    if (app.status === 'active' && !app.declares) warnings.push(`${at}: no statement yet of what it reads and writes`);
    if (app.install.addable && !app.details) warnings.push(`${at}: the Store has no details for it`);
  }
  return { errors, warnings };
}
