import { defineConfig } from 'bumpp'

// `pnpm release` 只改版本号并提交，不打 tag、不推送。
// 版本提交合进 main 后，Release workflow 自动发 npm、打 tag、建 GitHub Release。
export default defineConfig({
    files: [
        'package.json',
        'packages/*/package.json',
    ],
    commit: 'chore: release v%s',
    tag: false,
    push: false,
})
