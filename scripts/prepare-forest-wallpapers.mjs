import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const assetRoot = path.resolve('src/assets/backgrounds');
const partsRoot = path.join(assetRoot, 'forest-parts');

const assets = {
  'forest-dark-desktop.avif': [
    'forest-dark-desktop.avif-00.b64',
    'forest-dark-desktop.avif-01.b64',
    'forest-dark-desktop.avif-02.b64',
  ],
  'forest-dark-mobile.avif': [
    'forest-dark-mobile.avif-00.b64',
    'forest-dark-mobile.avif-01.b64',
  ],
  'forest-light-desktop.avif': [
    'forest-light-desktop.avif-00.b64',
    'forest-light-desktop.avif-01.b64',
    'forest-light-desktop.avif-02.b64',
    'forest-light-desktop.avif-03.b64',
  ],
  'forest-light-mobile.avif': [
    'forest-light-mobile.avif-00.b64',
    'forest-light-mobile.avif-01.b64',
  ],
};

for (const [assetName, partNames] of Object.entries(assets)) {
  const encoded = (await Promise.all(
    partNames.map((partName) => readFile(path.join(partsRoot, partName), 'utf8')),
  )).join('').replace(/\\s/g, '');
  const bytes = Buffer.from(encoded, 'base64');

  // The approved AVIFs are deliberately compact. Validate their container
  // signature and a conservative minimum size, not an arbitrary 5 KB limit.
  if (bytes.length < 1000 || bytes.subarray(4, 8).toString('ascii') !== 'ftyp') {
    throw new Error(`Forest wallpaper asset is incomplete or invalid: ${assetName}`);
  }

  await writeFile(path.join(assetRoot, assetName), bytes);
  console.log(`Prepared ${assetName} (${bytes.length.toLocaleString()} bytes)`);
}
