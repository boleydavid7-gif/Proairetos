// Compares two runs of check.mjs: what Home says, its markup, and its pictures byte for byte (pictures only when both
// arguments are directories; `baseline/*.json` holds what the calendar said before the Calendar migration, text and markup only).
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

/** Pictures are the same when no pixel differs by more than 4 of 255 in any channel (edge smoothing can differ by one). */
async function samePicture(x, y) {
  const [p, q] = await Promise.all([sharp(x).raw().toBuffer({ resolveWithObject: true }), sharp(y).raw().toBuffer({ resolveWithObject: true })]);
  if (p.info.width !== q.info.width || p.info.height !== q.info.height) return { same: false, note: 'different sizes' };
  let max = 0;
  let over = 0;
  for (let index = 0; index < p.data.length; index += 1) {
    const difference = Math.abs(p.data[index] - q.data[index]);
    if (difference > max) max = difference;
    if (difference > 4) over += 1;
  }
  return { same: over === 0, note: `largest channel difference ${max} of 255, ${over} channels over 4` };
}
const [a, b] = process.argv.slice(2);
const load = (path) => JSON.parse(readFileSync(path.endsWith('.json') ? path : join(path, 'calendar.json'), 'utf8'));
const A = load(a);
const B = load(b);
// React numbers the ids it makes (the marks' masks) in render order, so a count that moves is not a difference in the calendar.
const ids = (html) => html?.replace(/_r_[0-9a-z]+_/g, '_r_');
let differences = 0;
let smoothing = 0;
for (const run of Object.keys(A.runs)) {
  for (const name of ['today', 'list', 'week', 'month', 'year']) {
    const x = A.runs[run].views[name];
    const y = B.runs[run]?.views[name];
    if (JSON.stringify(x?.text) !== JSON.stringify(y?.text)) { differences += 1; console.log(`TEXT   ${run} ${name}\n  before: ${JSON.stringify(x?.text)}\n  after:  ${JSON.stringify(y?.text)}`); }
    if (ids(x?.html) !== ids(y?.html)) { differences += 1; console.log(`MARKUP ${run} ${name}`); }
    const file = `${run}-${name}.png`;
    if (!a.endsWith('.json') && existsSync(join(a, file)) && existsSync(join(b, file)) && !readFileSync(join(a, file)).equals(readFileSync(join(b, file)))) {
      const result = await samePicture(join(a, file), join(b, file));
      if (result.same) { smoothing += 1; continue; }
      differences += 1;
      console.log(`PICTURE ${file}: ${result.note}`);
    }
  }
}
console.log(differences ? `${differences} differences` : `The calendar is the same: text, markup and pictures${smoothing ? ` (${smoothing} pictures differ only by edge smoothing, under 5 of 255)` : ''}.`);
process.exit(differences ? 1 : 0);
