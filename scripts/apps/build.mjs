// npm run apps:build — writes the copies of the manifest that code outside TypeScript needs.
// Source of truth: src/core/apps/manifest.ts. Tests fail while any copy is out of date.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRegistry, root } from './lib.mjs';

const { runtimeRegistry, registryJson, workerBlock, edgeBlock, withBlock } = await loadRegistry();
const registry = runtimeRegistry();
const put = (file, text) => {
  const path = join(root, file);
  let before = '';
  try {
    before = readFileSync(path, 'utf8');
  } catch {}
  if (before !== text) writeFileSync(path, text);
  console.log(`${before === text ? 'same   ' : 'wrote  '}${file}`);
};
const edit = (file, block) => put(file, withBlock(readFileSync(join(root, file), 'utf8'), block));

put('src/core/apps/registry.generated.json', registryJson(registry));
edit('public/sw.js', workerBlock(registry));
edit('supabase/functions/send-reminders/index.ts', edgeBlock(registry));
