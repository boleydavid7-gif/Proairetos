import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'node:fs';

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

export default defineConfig({
  plugins: [react(), stampServiceWorker()],
  // Seven apps from one codebase: Proairetos at /, Askesis at /askesis/, SOMA at /soma/, Oikonomia at /oikonomia/, Hydros at /hydros/, Praxis at /praxis/, Theoria at /theoria/.
  build: {
    rollupOptions: {
      input: { main: 'index.html', askesis: 'askesis/index.html', soma: 'soma/index.html', oikonomia: 'oikonomia/index.html', hydros: 'hydros/index.html', praxis: 'praxis/index.html', theoria: 'theoria/index.html' },
    },
  },
  // When this copy was built, so Settings can say which build a phone is running.
  define: { __BUILT_AT__: JSON.stringify(builtAt) },
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
