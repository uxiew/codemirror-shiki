import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index.ts',
  ],
  declaration: true,
  rollup: {
    emitCJS: true,
    dts: {
      compilerOptions: {
        paths: {},
      },
    },
  },
  externals: [
    '@cmshiki/utils',
    '@codemirror/state',
    '@codemirror/view',
    'shiki',
  ],
})
