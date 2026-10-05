import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Seven apps from one codebase: Proairetos at /, Askesis at /askesis/, SOMA at /soma/, Oikonomia at /oikonomia/, Hydros at /hydros/, Praxis at /praxis/, Theoria at /theoria/.
  build: {
    rollupOptions: {
      input: { main: 'index.html', askesis: 'askesis/index.html', soma: 'soma/index.html', oikonomia: 'oikonomia/index.html', hydros: 'hydros/index.html', praxis: 'praxis/index.html', theoria: 'theoria/index.html' },
    },
  },
  // When this copy was built, so Settings can say which build a phone is running.
  define: { __BUILT_AT__: JSON.stringify(new Date().toISOString()) },
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
