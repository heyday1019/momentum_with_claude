import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // server-only is a Next.js guard package that throws at build time
      // when imported into a client bundle. In tests we run server code
      // directly under Node, so map it to an empty module.
      'server-only': path.resolve(__dirname, './src/test/server-only-stub.ts'),
    },
  },
})
