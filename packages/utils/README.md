# @cmshiki/utils

CodeMirror 6 的编辑器主题和样式工具。使用 `@cmshiki/shiki` 或 `@cmshiki/editor` 时，不需要单独安装。

[在线 Playground](https://uxiew.github.io/codemirror-shiki/)

## 安装

```sh
pnpm add @cmshiki/utils
```

## 最小用法

```ts
import { createTheme } from '@cmshiki/utils'

const editorTheme = createTheme({
  theme: 'light',
  settings: { background: '#fff', foreground: '#222' },
})
```

将 `editorTheme` 加入 CodeMirror 的 `extensions`。它设置编辑器界面样式，不负责语法高亮。编辑器需与本包使用同一份 `@codemirror/view`。

- `theme` 选择浅色或深色基础样式；`settings` 配置背景、文字、光标和选区。
- `classes` 添加自定义选择器样式。
- `mountStyles(view, spec, scopes?)` 挂载样式；使用 `&foo` 等自定义选择器时，需提供对应的 `scopes['&foo']`。

MIT
