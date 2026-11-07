// Compares two runs of shoot.mjs picture by picture and writes a diff (changed pixels in magenta over a faded copy)
// for each one that changed. Prints what changed, what is new and what is gone.
//   node scripts/visual-check/compare.mjs .visual/before .visual/after
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)(`${execSync('npm root -g').toString().trim()}/playwright`));
const [before, after] = process.argv.slice(2);
if (!before || !after) throw new Error('Usage: compare.mjs <before> <after>');
const diffs = join(after, 'diff');
mkdirSync(diffs, { recursive: true });

const names = (dir) => readdirSync(dir).filter((name) => name.endsWith('.png'));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage();
await page.setContent('<canvas></canvas>');
const changed = [];
for (const name of names(after)) {
  if (!existsSync(join(before, name))) continue;
  const result = await page.evaluate(
    async ([a, b]) => {
      const load = (src) => new Promise((done) => { const img = new Image(); img.onload = () => done(img); img.src = src; });
      const [one, two] = await Promise.all([load(a), load(b)]);
      const width = Math.max(one.width, two.width);
      const height = Math.max(one.height, two.height);
      const pixels = (img) => { const c = new OffscreenCanvas(width, height); const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, width, height).data; };
      const p = pixels(one);
      const q = pixels(two);
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      const out = ctx.createImageData(width, height);
      let differ = 0;
      for (let i = 0; i < p.length; i += 4) {
        const delta = Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]);
        if (delta > 24) {
          differ++;
          out.data.set([255, 0, 200, 255], i);
        } else {
          const grey = (q[i] + q[i + 1] + q[i + 2]) / 3;
          out.data.set([grey, grey, grey, 70], i);
        }
      }
      if (!differ) return { differ: 0 };
      ctx.putImageData(out, 0, 0);
      const blob = await canvas.convertToBlob();
      const data = new Uint8Array(await blob.arrayBuffer());
      let text = '';
      for (const byte of data) text += String.fromCharCode(byte);
      return { differ, share: differ / (width * height), sized: one.height !== two.height, png: btoa(text) };
    },
    [`data:image/png;base64,${readFileSync(join(before, name)).toString('base64')}`, `data:image/png;base64,${readFileSync(join(after, name)).toString('base64')}`],
  );
  if (!result.differ) continue;
  writeFileSync(join(diffs, name), Buffer.from(result.png, 'base64'));
  changed.push(`${name}: ${(result.share * 100).toFixed(2)}% of pixels${result.sized ? ', height changed' : ''}`);
}
await browser.close();
const added = names(after).filter((name) => !existsSync(join(before, name)));
const gone = names(before).filter((name) => !existsSync(join(after, name)));
console.log(changed.length ? `Changed (${changed.length}), diffs in ${diffs}:\n  ${changed.join('\n  ')}` : 'No picture changed.');
if (added.length) console.log(`New: ${added.join(', ')}`);
if (gone.length) console.log(`Gone: ${gone.join(', ')}`);
