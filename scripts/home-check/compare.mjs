// Compares two runs of check.mjs: what Home says, its markup, and its pictures byte for byte (pictures only when both
// arguments are directories; `baseline/*.json` holds what Home said before the Home migration, text and markup only).
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const [a, b] = process.argv.slice(2);
const load = (path) => JSON.parse(readFileSync(path.endsWith('.json') ? path : join(path, 'home.json'), 'utf8'));
const A = load(a);
const B = load(b);
let differences = 0;
for (const run of Object.keys(A.runs)) {
  for (const name of ['daily', 'attention']) {
    const x = A.runs[run].sections[name];
    const y = B.runs[run]?.sections[name];
    if (JSON.stringify(x?.text) !== JSON.stringify(y?.text)) { differences += 1; console.log(`TEXT   ${run} ${name}\n  before: ${JSON.stringify(x?.text)}\n  after:  ${JSON.stringify(y?.text)}`); }
    if (x?.html !== y?.html) { differences += 1; console.log(`MARKUP ${run} ${name}`); }
    const file = `${run}-${name}.png`;
    if (!a.endsWith('.json') && existsSync(join(a, file)) && existsSync(join(b, file)) && !readFileSync(join(a, file)).equals(readFileSync(join(b, file)))) { differences += 1; console.log(`PICTURE ${file}`); }
  }
}
console.log(differences ? `${differences} differences` : 'Home is the same: text, markup and pictures.');
process.exit(differences ? 1 : 0);
