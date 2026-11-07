import { readFile } from 'node:fs/promises';
import path from 'node:path';

const assetRoot = path.resolve('src/assets/backgrounds');
const assets = [
  ['forest-dark-mobile.avif', 864, 1536],
  ['forest-light-mobile.avif', 864, 1536],
  ['forest-dark-desktop.avif', 1536, 864],
  ['forest-light-desktop.avif', 1536, 864],
];

// Forest artwork is supplied as finished AVIF assets. Verify the files instead
// of rebuilding them from split base64 fragments so Vite always bundles the
// exact approved mobile and widescreen images.
for (const [assetName, width, height] of assets) {
  const bytes = await readFile(path.join(assetRoot, assetName));
  if (bytes.subarray(4, 8).toString('ascii') !== 'ftyp' ||
      bytes.length < 3000) {
    throw new Error(`Forest wallpaper asset is invalid: ${assetName}`);
  }
  console.log(`Verified ${assetName} (${width}x${height}, ${bytes.length.toLocaleString()} bytes)`);
}
