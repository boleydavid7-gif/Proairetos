import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { copyFileSync, createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const builtAt = new Date().toISOString();

/** Gives every build its own offline cache name, so a new version never waits on a hand-bumped number. */
const stampServiceWorker = (outDir: string) => ({
  name: 'stamp-service-worker',
  closeBundle() {
    const file = `${outDir}/sw.js`;
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
/*
 * Mneme's transcription (Whisper on the device) runs on ONNX Runtime's WebAssembly build, served from this site at
 * /ort/ (the content policy allows scripts from here only). The speech model itself comes from Hugging Face.
 */
const ORT_FILES: Record<string, string> = {
  'ort-wasm-simd-threaded.mjs': 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm': 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
};
const LOCAL_FILES: Record<string, Record<string, string>> = { ocr: OCR_FILES, ort: ORT_FILES };
const typeOf = (name: string) =>
  name.endsWith('.js') || name.endsWith('.mjs') ? 'text/javascript' : name.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream';
const ocrFiles = (include: boolean, outDir: string) => ({
  name: 'ocr-files',
  configureServer(server: { middlewares: { use: (handler: (req: { url?: string }, res: NodeJS.WritableStream & { setHeader: (k: string, v: string) => void }, next: () => void) => void) => void } }) {
    server.middlewares.use((req, res, next) => {
      const match = req.url?.match(/^\/(ocr|ort)\/([^?]+)/);
      const file = match && LOCAL_FILES[match[1]][match[2]];
      if (!match || !file) return next();
      res.setHeader('content-type', typeOf(match[2]));
      createReadStream(file).pipe(res);
    });
  },
  closeBundle() {
    if (!include || !existsSync(outDir)) return;
    for (const [dir, files] of Object.entries(LOCAL_FILES)) {
      mkdirSync(`${outDir}/${dir}`, { recursive: true });
      for (const [name, file] of Object.entries(files)) copyFileSync(file, `${outDir}/${dir}/${name}`);
    }
    // The bundler also copies the runtime's WebGPU build (about 25 MB), which Mneme never asks for (it points the
    // runtime at /ort/); it is left out of the site.
    for (const name of readdirSync(`${outDir}/assets`)) if (/^ort-wasm-simd-threaded\.(asyncify|jsep|jspi)-.*\.wasm$/.test(name)) rmSync(`${outDir}/assets/${name}`);
  },
});

const stripNativePayloads = (outDir: string) => ({
  name: 'strip-native-payloads',
  closeBundle() {
    rmSync(`${outDir}/sounds`, { recursive: true, force: true });
    rmSync(`${outDir}/ocr`, { recursive: true, force: true });
    rmSync(`${outDir}/ort`, { recursive: true, force: true });
  },
});

export default defineConfig(({ mode }) => {
  const native = mode === 'native';
  const outDir = native ? 'dist-native' : 'dist';
  return {
  plugins: [react(), stampServiceWorker(outDir), ocrFiles(!native, outDir), ...(native ? [stripNativePayloads(outDir)] : [])],
  // Family apps from one codebase: Poreia lives at /poreia/ alongside the existing companions.
  build: {
    outDir,
    rollupOptions: {
      input: { main: 'index.html', askesis: 'askesis/index.html', soma: 'soma/index.html', oikonomia: 'oikonomia/index.html', hydros: 'hydros/index.html', poreia: 'poreia/index.html', praxis: 'praxis/index.html', theoria: 'theoria/index.html', diaita: 'diaita/index.html', philia: 'philia/index.html', ergon: 'ergon/index.html', therapeia: 'therapeia/index.html', dynamis: 'dynamis/index.html', ktema: 'ktema/index.html', phyton: 'phyton/index.html', mneme: 'mneme/index.html', lamplight: 'lamplight/index.html' },
    },
  },
  // When this copy was built, so Settings can say which build a phone is running.
  define: { __BUILT_AT__: JSON.stringify(builtAt) },
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  };
});
