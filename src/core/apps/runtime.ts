import { APPS, type AppManifest } from './manifest';

/*
 * The part of the manifest that code which cannot import it needs: the service worker (a plain script) and the
 * reminder edge function (Deno). Everything here is plain JSON. `scripts/apps/build.mjs` writes it to
 * `src/core/apps/registry.generated.json` and into marked blocks in `public/sw.js` and
 * `supabase/functions/send-reminders/index.ts`; tests keep all three equal to this function's result.
 */
export type RuntimeRegistry = {
  /** Every other app's address (the worker's shell and its "is this window another app" check). */
  appPaths: string[];
  /** The apps whose open windows are told apart from Proairetos's when a notice is tapped. */
  windowPaths: string[];
  /** The apps that have a reminder source (their id is the source). */
  sources: string[];
  /** The name a notice wears in the service worker (a retired app wears the name of the app it lives in). */
  noticeNames: Record<string, string>;
  /** The name on an iPhone's own push (the app's own name). */
  pushNames: Record<string, string>;
  /** The icon path on an iPhone's own push. */
  pushIcons: Record<string, string>;
  /** Sources whose tap opens `/<id>/?open=…`. */
  genericTap: string[];
};

export function runtimeRegistry(apps: readonly AppManifest[] = APPS): RuntimeRegistry {
  const others = apps.filter((app) => app.status !== 'main');
  const sourced = apps.filter((app) => app.notices.source);
  const nameOf = (app: AppManifest) => (app.aliasOf ? (apps.find((each) => each.id === app.aliasOf)?.name ?? app.name) : app.name);
  const iconOf = (app: AppManifest) => app.notices.pushIcon ?? (app.status === 'main' ? '/icons/icon-192.png' : `/${app.id}/icons/icon-192.png`);
  return {
    appPaths: others.map((app) => app.urls.href),
    windowPaths: others.filter((app) => app.surfaces.noticeWindow).map((app) => app.urls.href),
    sources: sourced.map((app) => app.id),
    noticeNames: Object.fromEntries(sourced.map((app) => [app.id, nameOf(app)])),
    pushNames: Object.fromEntries(sourced.map((app) => [app.id, app.name])),
    pushIcons: Object.fromEntries(sourced.map((app) => [app.id, iconOf(app)])),
    genericTap: others.filter((app) => app.notices.genericTap).map((app) => app.id),
  };
}

/* Generated copies. The marked block in a file is replaced whole; everything outside it is the file's own. */
const BEGIN = '// BEGIN GENERATED REGISTRY';
const END = '// END GENERATED REGISTRY';
const NOTE = '(npm run apps:build, from src/core/apps/manifest.ts; a test keeps it current)';

/** The generated JSON file: the whole runtime registry. */
export function registryJson(registry: RuntimeRegistry = runtimeRegistry()): string {
  return `${JSON.stringify(registry, null, 2)}\n`;
}

/** The block for the service worker (a plain script). */
export function workerBlock(registry: RuntimeRegistry = runtimeRegistry()): string {
  return `${BEGIN} ${NOTE}\nconst REGISTRY = ${JSON.stringify(registry)};\n${END}`;
}

/** The block for the reminder edge function: only what it reads. */
export function edgeBlock(registry: RuntimeRegistry = runtimeRegistry()): string {
  const { pushNames, pushIcons } = registry;
  return `${BEGIN} ${NOTE}\nconst REGISTRY: { pushNames: Record<string, string>; pushIcons: Record<string, string> } = ${JSON.stringify({ pushNames, pushIcons })};\n${END}`;
}

/** The text with its marked block replaced. Throws when the markers are missing. */
export function withBlock(text: string, block: string): string {
  const from = text.indexOf(BEGIN);
  const to = text.indexOf(END);
  if (from < 0 || to < from) throw new Error('the generated registry markers are missing');
  return text.slice(0, from) + block + text.slice(to + END.length);
}
