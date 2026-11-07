import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const assetRoot = path.resolve('src/assets/backgrounds');
const partsRoot = path.join(assetRoot, 'forest-parts');

const assets = {
  'forest-dark-desktop.avif': [
    'forest-dark-desktop-0.b64',
    'forest-dark-desktop-1.b64',
    'forest-dark-desktop-2.b64',
  ],
  'forest-dark-mobile.avif': [
    'forest-dark-mobile-0.b64',
    'forest-dark-mobile-1.b64',
  ],
  'forest-light-desktop.avif': [
    'forest-light-desktop-0.b64',
    'forest-light-desktop-1.b64',
    'forest-light-desktop-2.b64',
    'forest-light-desktop-3.b64',
  ],
  'forest-light-mobile.avif': [
    'forest-light-mobile-0.b64',
    'forest-light-mobile-1.b64',
  ],
};

for (const [assetName, partNames] of Object.entries(assets)) {
  const encoded = (await Promise.all(
    partNames.map((partName) => readFile(path.join(partsRoot, partName), 'utf8')),
  )).join('').replace(/\s/g, '');
  const bytes = Buffer.from(encoded, 'base64');

  if (bytes.length < 5000 || bytes.subarray(4, 8).toString('ascii') !== 'ftyp') {
    throw new Error(`Forest wallpaper asset is incomplete or invalid: ${assetName}`);
  }

  await writeFile(path.join(assetRoot, assetName), bytes);
  console.log(`Prepared ${assetName} (${bytes.length.toLocaleString()} bytes)`);
}
