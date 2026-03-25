import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index.ts'],
  declaration: true,
  rollup: {
    emitCJS: true,
    inlineDependencies: ['style-mod'],
  },
  externals: ['@codemirror/view', '@codemirror/state'],
});
