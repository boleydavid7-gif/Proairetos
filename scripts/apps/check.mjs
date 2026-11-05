// npm run apps:check — validates the application manifest and its files.
// Exits 1 only on errors; warnings are listed and never fail the run.
import { loadRegistry, diskFiles } from './lib.mjs';

const { APPS, validateManifest, checkAssets } = await loadRegistry();
const a = validateManifest(APPS);
const b = checkAssets(diskFiles(), APPS);
const errors = [...a.errors, ...b.errors];
const warnings = [...a.warnings, ...b.warnings];
for (const w of warnings) console.log('warning: ' + w);
for (const e of errors) console.log('error: ' + e);
console.log(`${APPS.length} apps, ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
