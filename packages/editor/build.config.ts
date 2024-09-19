import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
    entries: [
        'src/index.ts',
        'src/simple.ts',
    ],
    declaration: true,
    rollup: {
        emitCJS: false,
        dts: {
        },
    },
    externals: [
    ],
})
