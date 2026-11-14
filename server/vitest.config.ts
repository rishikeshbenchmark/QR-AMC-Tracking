import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

/**
 * Tests live outside `rootDir: src` so they stay out of the build. The `@/` alias is declared here
 * because vitest resolves imports itself and does not read tsconfig paths.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
