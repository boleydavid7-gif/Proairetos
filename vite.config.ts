import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const builtAt = new Date().toISOString();

/** Gives every build its own offline cache name, so a new version never waits on a hand-bumped number. */
const stampServiceWorker = () => ({
  name: 'stamp-service-worker',
  closeBundle() {
    const file = 'dist/sw.js';
    try {
      const text = readFileSync(file, 'utf8');
      const stamp = builtAt.replace(/[^0-9]/g, '').slice(0, 14);
      writeFileSync(file, text.replace(/const CACHE = 'proairetos-v(\d+)[^']*';/, `const CACHE = 'proairetos-v$1-${stamp}';`));
    } catch {
      // No copied service worker (a partial build): nothing to stamp.
    }
  },
});

/*
 * Reading text from photos (Tesseract, on the device) needs its worker, its WebAssembly core and the English data from
 * this site: served from node_modules while developing and copied into dist/ocr/ by a build. Nothing in the repository.
 */
const OCR_FILES: Record<string, string> = {
  'worker.min.js': 'node_modules/tesseract.js/dist/worker.min.js',
  'tesseract-core-simd-lstm.wasm.js': 'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js': 'node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js',
  'tesseract-core-lstm.wasm.js': 'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js',
  'eng.traineddata.gz': 'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
};
const ocrFiles = () => ({
  name: 'ocr-files',
  configureServer(server: { middlewares: { use: (handler: (req: { url?: string }, res: NodeJS.WritableStream & { setHeader: (k: string, v: string) => void }, next: () => void) => void) => void } }) {
    server.middlewares.use((req, res, next) => {
      const name = req.url?.match(/^\/ocr\/([^?]+)/)?.[1];
      const file = name && OCR_FILES[name];
      if (!file) return next();
      res.setHeader('content-type', name.endsWith('.js') ? 'text/javascript' : 'application/octet-stream');
      createReadStream(file).pipe(res);
    });
  },
  closeBundle() {
    if (!existsSync('dist')) return;
    mkdirSync('dist/ocr', { recursive: true });
    for (const [name, file] of Object.entries(OCR_FILES)) copyFileSync(file, `dist/ocr/${name}`);
  },
});

export default defineConfig({
  plugins: [react(), stampServiceWorker(), ocrFiles()],
  // Family apps from one codebase: Poreia lives at /poreia/ alongside the existing companions.
  build: {
    rollupOptions: {
      input: { main: 'index.html', askesis: 'askesis/index.html', soma: 'soma/index.html', oikonomia: 'oikonomia/index.html', hydros: 'hydros/index.html', poreia: 'poreia/index.html', praxis: 'praxis/index.html', theoria: 'theoria/index.html', diaita: 'diaita/index.html', philia: 'philia/index.html', ergon: 'ergon/index.html', therapeia: 'therapeia/index.html', dynamis: 'dynamis/index.html', ktema: 'ktema/index.html', phyton: 'phyton/index.html', lamplight: 'lamplight/index.html' },
    },
  },
  // When this copy was built, so Settings can say which build a phone is running.
  define: { __BUILT_AT__: JSON.stringify(builtAt) },
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
