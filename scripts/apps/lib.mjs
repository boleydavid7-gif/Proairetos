// Loads the application manifest (pure TypeScript data) from Node scripts.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

export const root = resolve(new URL('../..', import.meta.url).pathname);

export async function loadRegistry() {
  const out = await build({
    entryPoints: [join(root, 'src/core/apps/index.ts')],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
  });
  const code = out.outputFiles[0].text;
  const url = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  return import(url);
}

export function diskFiles() {
  return {
    exists: (p) => existsSync(join(root, p)),
    list: (p) => (existsSync(join(root, p)) ? readdirSync(join(root, p)) : []),
    readJson: (p) => {
      try {
        return JSON.parse(readFileSync(join(root, p), 'utf8'));
      } catch {
        return undefined;
      }
    },
  };
}

export { pathToFileURL };

/** The ids of the apps a check covers, in manifest order (`surfaces.<flag>` in src/core/apps/manifest.ts). */
export async function surfaceIds(flag) {
  const { APPS } = await loadRegistry();
  return APPS.filter((app) => app.surfaces[flag]).map((app) => app.id);
}
