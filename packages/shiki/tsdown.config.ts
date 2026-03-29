import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  deps: {
    neverBundle: ['@shikijs/vscode-textmate', 'shiki', '@shikijs/types'],
  },
});
