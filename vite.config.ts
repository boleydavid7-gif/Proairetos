import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // When this copy was built, so Settings can say which build a phone is running.
  define: { __BUILT_AT__: JSON.stringify(new Date().toISOString()) },
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
