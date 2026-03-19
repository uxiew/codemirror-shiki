import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index.ts', 'src/core.ts'],
  declaration: true,
  rollup: {
    emitCJS: false,
    dts: {},
  },
  externals: [
    '@cmshiki/shiki',
    '@cmshiki/shiki/core',
    '@cmshiki/utils',
    '@codemirror/state',
    '@codemirror/view',
    'shiki',
  ],
});
