import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    sourcemap: true,
    target: 'esnext',
    outDir: 'dist-core-preload',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(rootDir, 'core-preload.html'),
    },
  },
});
